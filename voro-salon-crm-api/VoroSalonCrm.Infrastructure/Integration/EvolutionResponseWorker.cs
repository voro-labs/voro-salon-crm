using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Integration;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Responde no WhatsApp as mensagens inbound que o bot da Evolution ainda não processou.
    /// <para>
    /// O worker acorda por aviso (<see cref="IEvolutionMessageSignal"/>), e não por varredura.
    /// Antes ele consultava <c>WhatsAppMessages</c> a cada 5 segundos: ~17 mil consultas por
    /// dia, praticamente todas sem resultado, mantendo o compute do Postgres acordado 24h por
    /// dia e estourando o teto de compute hours do plano (issue #129).
    /// </para>
    /// </summary>
    public class EvolutionResponseWorker(
        IServiceScopeFactory scopeFactory,
        IEvolutionMessageSignal signal,
        IMemoryCache cache,
        ILogger<EvolutionResponseWorker> logger) : BackgroundService
    {
        /// <summary>
        /// Varredura de segurança, para o caso de nenhum aviso chegar.
        /// <para>
        /// O aviso vive na memória do processo: um webhook atendido por outra máquina do Fly
        /// não acorda este worker. Um intervalo longo cobre esse caso sem voltar ao custo do
        /// polling — 144 consultas por dia em vez de 17.280 — e a deduplicação continua sendo
        /// o <c>ProcessedByBotAt</c>, então processar em duplicidade não é risco novo.
        /// </para>
        /// <para>
        /// Usa a grade compartilhada do <see cref="PeriodicJobSchedule"/>: a varredura cai no
        /// mesmo instante dos demais jobs, então não abre uma rajada só dela no meio de uma
        /// janela de ociosidade (issue #129).
        /// </para>
        /// </summary>
        private static readonly TimeSpan SafetyNetInterval = PeriodicJobSchedule.Grid;

        private const string ConnectedTenantsCacheKey = "evolution_connected_tenant_ids";
        private static readonly TimeSpan TenantCacheTtl = TimeSpan.FromSeconds(60);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("EvolutionResponseWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                int processed;

                try
                {
                    processed = await ProcessPendingMessagesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Unhandled error in EvolutionResponseWorker cycle.");
                    processed = 0;
                }

                // Lote cheio significa que ainda há fila: segue direto, sem esperar aviso nem
                // varredura. Sem isto, um acúmulo de 100 mensagens levaria 25 minutos para sair.
                if (processed >= MaxMessagesPerCycle)
                    continue;

                // O tempo de espera é o que falta para o próximo instante da grade, e não um
                // intervalo cheio: senão a varredura andaria em fase própria, que é justamente
                // o desalinhamento que a grade veio resolver. Um aviso continua acordando o
                // worker na hora, sem esperar a grade.
                var untilNextTick = PeriodicJobSchedule.TimeUntilNextTick(
                    DateTimeOffset.UtcNow, SafetyNetInterval);

                try
                {
                    await signal.WaitAsync(untilNextTick, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        /// <summary>Mensagens processadas por ciclo.</summary>
        private const int MaxMessagesPerCycle = 20;

        /// <returns>Quantidade de mensagens processadas no ciclo.</returns>
        private async Task<int> ProcessPendingMessagesAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();
            var bookingService = scope.ServiceProvider.GetRequiredService<IEvolutionBookingChatService>();

            var connectedTenantIds = await GetConnectedTenantIdsAsync(db, ct);
            if (connectedTenantIds.Count == 0) return 0;

            var cutoff = DateTimeOffset.UtcNow.AddHours(-24);

            var messages = await db.WhatsAppMessages
                .Where(m =>
                    m.ProcessedByBotAt == null &&
                    m.Direction == "inbound" &&
                    connectedTenantIds.Contains(m.TenantId) &&
                    m.Timestamp > cutoff)
                .OrderBy(m => m.Timestamp)
                .Take(MaxMessagesPerCycle)
                .ToListAsync(ct);

            foreach (var msg in messages)
            {
                try
                {
                    await bookingService.HandleMessageAsync(msg, ct);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Erro não tratado ao processar mensagem {MessageId} pelo bot Evolution.", msg.Id);
                    msg.ProcessedByBotAt ??= DateTimeOffset.UtcNow;
                }

                try
                {
                    await db.SaveChangesAsync(ct);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Erro ao persistir ProcessedByBotAt para mensagem {MessageId}.", msg.Id);
                }
            }

            return messages.Count;
        }

        private async Task<List<Guid>> GetConnectedTenantIdsAsync(JasmimDbContext db, CancellationToken ct)
        {
            if (cache.TryGetValue(ConnectedTenantsCacheKey, out List<Guid>? cached))
                return cached!;

            // Tenants com instância própria conectada
            var connectedInstances = await db.TenantEvolutionInstances
                .Where(i => i.Status == EvolutionInstanceStatus.Connected)
                .Select(i => new { i.TenantId, i.Id })
                .ToListAsync(ct);

            var ownerTenantIds = connectedInstances.Select(x => x.TenantId).ToList();
            var connectedDbIds = connectedInstances.Select(x => x.Id).ToList();

            // Tenants vinculados a instâncias conectadas (compartilhamento)
            var linkedTenantIds = connectedDbIds.Count > 0
                ? await db.TenantEvolutionInstanceLinks
                    .Where(l => connectedDbIds.Contains(l.InstanceId))
                    .Select(l => l.TenantId)
                    .ToListAsync(ct)
                : new List<Guid>();

            var ids = ownerTenantIds.Concat(linkedTenantIds).Distinct().ToList();
            cache.Set(ConnectedTenantsCacheKey, ids, TenantCacheTtl);
            return ids;
        }
    }
}
