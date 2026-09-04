using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Auditing
{
    /// <summary>
    /// Expurga <c>RouteAuditLogs</c> antigos uma vez por dia.
    /// <para>
    /// A tabela recebe uma linha por requisição HTTP e não tinha rotina de limpeza — crescia
    /// sem limite, levando junto bloat, autovacuum e tamanho de backup (issue #115).
    /// </para>
    /// <para>
    /// Retenção configurável em <c>Auditing:RouteRetentionDays</c>; padrão 30 dias.
    /// Valor menor ou igual a zero desliga o expurgo.
    /// </para>
    /// </summary>
    public class RouteAuditRetentionJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<RouteAuditRetentionJob> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromHours(24);
        private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(5);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var retentionDays = configuration.GetValue("Auditing:RouteRetentionDays", 30);

            if (retentionDays <= 0)
            {
                logger.LogInformation("RouteAuditRetentionJob desabilitado (Auditing:RouteRetentionDays <= 0).");
                return;
            }

            logger.LogInformation("RouteAuditRetentionJob started. Retenção: {Days} dia(s).", retentionDays);

            // Não competir com o boot da aplicação.
            try
            {
                await Task.Delay(StartupDelay, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await PurgeAsync(retentionDays, stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Erro ao expurgar RouteAuditLogs.");
                }

                try
                {
                    await Task.Delay(Interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        /// <summary>Linhas apagadas por transação.</summary>
        private const int ChunkSize = 10_000;

        /// <summary>Teto de blocos por execução, para a limpeza não virar um loop infinito.</summary>
        private const int MaxChunksPerRun = 500;

        private static readonly TimeSpan PauseBetweenChunks = TimeSpan.FromSeconds(1);

        private async Task PurgeAsync(int retentionDays, CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.AddDays(-retentionDays);
            var totalDeleted = 0;

            // Apaga em blocos, e não num único DELETE. A tabela nunca teve expurgo, então o
            // primeiro run pode encontrar milhões de linhas: um DELETE só estouraria o command
            // timeout padrão (30s), seria revertido inteiro e nunca convergiria — segurando
            // locks e gerando bloat na própria tabela que deveria estar limpando.
            for (var chunk = 0; chunk < MaxChunksPerRun && !ct.IsCancellationRequested; chunk++)
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();

                var ids = await db.RouteAuditLogs
                    .Where(l => l.Timestamp < cutoff)
                    .OrderBy(l => l.Timestamp)
                    .Select(l => l.Id)
                    .Take(ChunkSize)
                    .ToListAsync(ct);

                if (ids.Count == 0) break;

                totalDeleted += await db.RouteAuditLogs
                    .Where(l => ids.Contains(l.Id))
                    .ExecuteDeleteAsync(ct);

                // Menos que um bloco cheio significa que chegamos ao fim.
                if (ids.Count < ChunkSize) break;

                // Dá folga para o autovacuum e para o tráfego normal entre os blocos.
                await Task.Delay(PauseBetweenChunks, ct);
            }

            if (totalDeleted > 0)
                logger.LogInformation("Expurgados {Count} RouteAuditLog(s) anteriores a {Cutoff:u}.", totalDeleted, cutoff);
        }
    }
}
