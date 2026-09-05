using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Auditing
{
    /// <summary>
    /// Expurga <c>EntityAuditLogs</c> antigos uma vez por dia.
    /// <para>
    /// Mesma situação do <see cref="RouteAuditRetentionJob"/>: a tabela nunca teve rotina de
    /// limpeza e crescia sem limite, levando junto bloat, autovacuum e tamanho de backup
    /// (issue #117).
    /// </para>
    /// <para>
    /// Retenção configurável em <c>Auditing:EntityRetentionDays</c>; padrão 365 dias — mais longa
    /// que a de rota (30) porque aqui entram prontuário, movimentação financeira e mudança de
    /// acesso. Valor menor ou igual a zero desliga o expurgo.
    /// </para>
    /// </summary>
    public class EntityAuditRetentionJob(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<EntityAuditRetentionJob> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

        /// <summary>
        /// Sobe depois do <see cref="RouteAuditRetentionJob"/> (5 min) de propósito: os dois
        /// varrem tabelas grandes, e rodar junto no primeiro boot dobraria a carga à toa.
        /// </summary>
        private static readonly TimeSpan StartupDelay = TimeSpan.FromMinutes(20);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var retentionDays = configuration.GetValue("Auditing:EntityRetentionDays", 365);

            if (retentionDays <= 0)
            {
                logger.LogInformation("EntityAuditRetentionJob desabilitado (Auditing:EntityRetentionDays <= 0).");
                return;
            }

            logger.LogInformation("EntityAuditRetentionJob started. Retenção: {Days} dia(s).", retentionDays);

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
                    logger.LogError(ex, "Erro ao expurgar EntityAuditLogs.");
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

            // Apaga em blocos, e não num único DELETE. A tabela nunca teve expurgo e recebia uma
            // linha por entidade alterada, então o primeiro run pode encontrar milhões de linhas:
            // um DELETE só estouraria o command timeout padrão (30s), seria revertido inteiro e
            // nunca convergiria — segurando locks e gerando bloat na própria tabela que deveria
            // estar limpando.
            for (var chunk = 0; chunk < MaxChunksPerRun && !ct.IsCancellationRequested; chunk++)
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();

                var ids = await db.EntityAuditLogs
                    .Where(l => l.Timestamp < cutoff)
                    .OrderBy(l => l.Timestamp)
                    .Select(l => l.Id)
                    .Take(ChunkSize)
                    .ToListAsync(ct);

                if (ids.Count == 0) break;

                totalDeleted += await db.EntityAuditLogs
                    .Where(l => ids.Contains(l.Id))
                    .ExecuteDeleteAsync(ct);

                // Menos que um bloco cheio significa que chegamos ao fim.
                if (ids.Count < ChunkSize) break;

                // Dá folga para o autovacuum e para o tráfego normal entre os blocos.
                await Task.Delay(PauseBetweenChunks, ct);
            }

            if (totalDeleted > 0)
                logger.LogInformation("Expurgados {Count} EntityAuditLog(s) anteriores a {Cutoff:u}.", totalDeleted, cutoff);
        }
    }
}
