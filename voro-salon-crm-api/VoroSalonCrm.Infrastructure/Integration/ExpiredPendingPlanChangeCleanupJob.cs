using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Runs every 5 minutes and deletes PendingPlanChange records that have expired
    /// (ExpiresAt &lt; now). Expired entries are simply dropped — no subscription change occurs.
    /// </summary>
    public class ExpiredPendingPlanChangeCleanupJob(
        IServiceScopeFactory scopeFactory,
        ILogger<ExpiredPendingPlanChangeCleanupJob> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("ExpiredPendingPlanChangeCleanupJob started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DeleteExpiredChangesAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error deleting expired pending plan changes.");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task DeleteExpiredChangesAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();

            var now = DateTimeOffset.UtcNow;

            var expired = await db.PendingPlanChanges
                .Where(p => p.ExpiresAt < now)
                .ToListAsync(ct);

            if (expired.Count == 0) return;

            db.PendingPlanChanges.RemoveRange(expired);
            await db.SaveChangesAsync(ct);

            logger.LogInformation("Deleted {Count} expired pending plan change(s).", expired.Count);
        }
    }
}
