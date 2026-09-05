using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Auditing
{
    /// <summary>
    /// Consome a <see cref="RouteAuditQueue"/> e grava os logs em lote, fora do caminho
    /// da requisição HTTP (issue #115).
    /// </summary>
    public class RouteAuditWriter(
        RouteAuditQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<RouteAuditWriter> logger) : BackgroundService
    {
        private const int MaxBatchSize = 200;

        private static readonly TimeSpan MinFailureBackoff = TimeSpan.FromSeconds(1);
        private static readonly TimeSpan MaxFailureBackoff = TimeSpan.FromMinutes(1);

        /// <summary>Tempo máximo gasto drenando a fila durante o shutdown.</summary>
        private static readonly TimeSpan ShutdownDrainBudget = TimeSpan.FromSeconds(4);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("RouteAuditWriter started.");

            var batch = new List<RouteAuditLog>(MaxBatchSize);
            var backoff = MinFailureBackoff;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Bloqueia até haver ao menos um item; devolve false quando o canal fecha.
                    if (!await queue.Reader.WaitToReadAsync(stoppingToken))
                        break;

                    batch.Clear();
                    while (batch.Count < MaxBatchSize && queue.Reader.TryRead(out var log))
                        batch.Add(log);

                    if (batch.Count > 0)
                    {
                        await FlushAsync(batch, stoppingToken);
                        backoff = MinFailureBackoff; // sucesso zera o backoff
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Auditoria nunca pode derrubar o worker: loga, descarta o lote e segue.
                    logger.LogError(ex,
                        "Erro ao gravar lote de auditoria de rotas. {Count} log(s) perdido(s). Aguardando {Backoff} antes de tentar de novo.",
                        batch.Count, backoff);

                    // Sem esta pausa, um erro que falha rápido (banco fora, violação de
                    // constraint) transformaria o loop num spin: ler, falhar, repetir,
                    // inundando o log e queimando CPU.
                    try
                    {
                        await Task.Delay(backoff, stoppingToken);
                    }
                    catch (OperationCanceledException)
                    {
                        break;
                    }

                    backoff = backoff < MaxFailureBackoff
                        ? TimeSpan.FromTicks(Math.Min(backoff.Ticks * 2, MaxFailureBackoff.Ticks))
                        : MaxFailureBackoff;
                }
            }

            await DrainOnShutdownAsync();
        }

        private async Task FlushAsync(List<RouteAuditLog> batch, CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();

            db.RouteAuditLogs.AddRange(batch);
            await db.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Best-effort no shutdown. Drena em lotes sucessivos até esvaziar a fila ou estourar
        /// o orçamento de tempo — com auto_stop_machines ligado, a máquina para com frequência
        /// e drenar só um lote deixaria o resto da fila para trás a cada parada.
        /// </summary>
        private async Task DrainOnShutdownAsync()
        {
            using var cts = new CancellationTokenSource(ShutdownDrainBudget);
            var batch = new List<RouteAuditLog>(MaxBatchSize);
            var drained = 0;

            try
            {
                while (!cts.IsCancellationRequested)
                {
                    batch.Clear();
                    while (batch.Count < MaxBatchSize && queue.Reader.TryRead(out var log))
                        batch.Add(log);

                    if (batch.Count == 0) break;

                    await FlushAsync(batch, cts.Token);
                    drained += batch.Count;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex,
                    "Drenagem da fila de auditoria interrompida no shutdown após {Drained} log(s).", drained);
                return;
            }

            if (drained > 0)
                logger.LogInformation("Drenados {Drained} log(s) de auditoria no shutdown.", drained);
        }
    }
}
