using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionResponseWorker(
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        ILogger<EvolutionResponseWorker> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);
        private const string ConnectedTenantsCacheKey = "evolution_connected_tenant_ids";
        private static readonly TimeSpan TenantCacheTtl = TimeSpan.FromSeconds(60);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("EvolutionResponseWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingMessagesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Unhandled error in EvolutionResponseWorker cycle.");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task ProcessPendingMessagesAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();
            var bookingService = scope.ServiceProvider.GetRequiredService<IEvolutionBookingChatService>();

            var connectedTenantIds = await GetConnectedTenantIdsAsync(db, ct);
            if (connectedTenantIds.Count == 0) return;

            var cutoff = DateTimeOffset.UtcNow.AddHours(-24);

            var messages = await db.WhatsAppMessages
                .Where(m =>
                    m.ProcessedByBotAt == null &&
                    m.Direction == "inbound" &&
                    connectedTenantIds.Contains(m.TenantId) &&
                    m.Timestamp > cutoff)
                .OrderBy(m => m.Timestamp)
                .Take(20)
                .ToListAsync(ct);

            foreach (var msg in messages)
            {
                await bookingService.HandleMessageAsync(msg, ct);
                await db.SaveChangesAsync(ct);
            }
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
