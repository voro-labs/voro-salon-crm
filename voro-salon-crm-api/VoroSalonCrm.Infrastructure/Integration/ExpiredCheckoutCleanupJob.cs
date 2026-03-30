using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Roda a cada minuto e cancela checkouts pendentes (Inactive) que
    /// não foram concluídos dentro de 10 minutos, preservando a assinatura
    /// anterior (Trial ou Active) como a assinatura vigente do tenant.
    /// </summary>
    public class ExpiredCheckoutCleanupJob(
        IServiceScopeFactory scopeFactory,
        ILogger<ExpiredCheckoutCleanupJob> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("ExpiredCheckoutCleanupJob started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CancelExpiredCheckoutsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error cancelling expired checkouts.");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task CancelExpiredCheckoutsAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();

            var now = DateTimeOffset.UtcNow;

            var expired = await db.TenantSubscriptions
                .Where(s =>
                    s.Status == SubscriptionStatus.Inactive &&
                    s.CheckoutExpiresAt != null &&
                    s.CheckoutExpiresAt < now)
                .ToListAsync(ct);

            if (expired.Count == 0) return;

            foreach (var sub in expired)
            {
                sub.Status = SubscriptionStatus.Cancelled;
                sub.UpdatedAt = now;
            }

            await db.SaveChangesAsync(ct);

            logger.LogInformation("Cancelled {Count} expired pending checkout(s).", expired.Count);
        }
    }
}
