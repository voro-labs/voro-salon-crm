using System.Threading.Channels;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Auditing;

namespace VoroSalonCrm.Infrastructure.Auditing
{
    /// <summary>
    /// Implementação da fila de auditoria de rotas sobre um <see cref="Channel{T}"/> limitado.
    /// <para>
    /// A capacidade é limitada de propósito: se o writer não der conta (banco lento, pico de
    /// tráfego), os logs mais novos são descartados em vez de acumular memória sem limite.
    /// Perder log de auditoria é preferível a derrubar a API por OOM.
    /// </para>
    /// </summary>
    public sealed class RouteAuditQueue : IRouteAuditQueue
    {
        private readonly Channel<RouteAuditLog> _channel;
        private readonly ILogger<RouteAuditQueue> _logger;

        private long _droppedSinceLastWarning;

        public RouteAuditQueue(ILogger<RouteAuditQueue> logger, int capacity = 10_000)
        {
            _logger = logger;
            // FullMode.Wait, e não DropWrite: com DropWrite o TryWrite descarta o item mas
            // devolve true, o que tornaria o descarte invisível. Com Wait, TryWrite continua
            // sem bloquear (quem bloqueia é o WriteAsync) e devolve false quando cheio, o que
            // permite contabilizar e logar a perda.
            _channel = Channel.CreateBounded<RouteAuditLog>(new BoundedChannelOptions(capacity)
            {
                FullMode     = BoundedChannelFullMode.Wait,
                SingleReader = true,
                SingleWriter = false
            });
        }

        /// <summary>Lado de leitura, consumido pelo <see cref="RouteAuditWriter"/>.</summary>
        public ChannelReader<RouteAuditLog> Reader => _channel.Reader;

        public bool TryEnqueue(RouteAuditLog log)
        {
            Truncate(log);

            if (_channel.Writer.TryWrite(log))
                return true;

            // Fila cheia. Loga de forma agregada para não trocar um gargalo de banco por
            // um gargalo de log.
            var dropped = Interlocked.Increment(ref _droppedSinceLastWarning);
            if (dropped % 1_000 == 1)
            {
                _logger.LogWarning(
                    "Fila de auditoria de rotas cheia. {Dropped} log(s) descartado(s) desde o último aviso.",
                    dropped);
            }

            return false;
        }

        // Limites das colunas em RouteAuditLog. Truncar aqui, na entrada da fila, e não na
        // gravação: os logs são gravados em lote, então uma única linha estourando o
        // MaxLength faria o SaveChanges do lote inteiro falhar e derrubar junto até 199
        // registros sem relação nenhuma com o problema. Path é o caso real — URLs longas
        // passam fácil de 500 caracteres.
        private const int MaxMethodLength = 20;
        private const int MaxPathLength = 500;
        private const int MaxIpAddressLength = 100;

        private static void Truncate(RouteAuditLog log)
        {
            log.Method    = Cap(log.Method, MaxMethodLength)!;
            log.Path      = Cap(log.Path, MaxPathLength)!;
            log.IPAddress = Cap(log.IPAddress, MaxIpAddressLength);
        }

        private static string? Cap(string? value, int max) =>
            value is not null && value.Length > max ? value[..max] : value;
    }
}
