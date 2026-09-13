using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Apaga registros de <c>PendingPlanChange</c> vencidos (<c>ExpiresAt &lt; now</c>).
    /// Pendência vencida é simplesmente descartada — nenhuma assinatura muda por causa dela.
    /// <para>
    /// Passou de 5 para 10 minutos e entrou na grade compartilhada do
    /// <see cref="PeriodicJobSchedule"/> (issue #129). Rodar fora de fase com os outros jobs
    /// picotava a ociosidade do Postgres, e este aqui é pura faxina: todo caminho que lê uma
    /// pendência ou a apaga ou a substitui, nenhum aplica uma pendência vencida, então viver
    /// cinco minutos a mais na tabela não muda comportamento nenhum.
    /// </para>
    /// </summary>
    public class ExpiredPendingPlanChangeCleanupJob(
        IServiceScopeFactory scopeFactory,
        ILogger<ExpiredPendingPlanChangeCleanupJob> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = PeriodicJobSchedule.Grid;

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

                await PeriodicJobSchedule.WaitForNextTickAsync(Interval, stoppingToken);
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
