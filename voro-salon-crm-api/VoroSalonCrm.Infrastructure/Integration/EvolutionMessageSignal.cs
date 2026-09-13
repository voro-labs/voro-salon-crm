using System.Threading.Channels;
using VoroSalonCrm.Domain.Interfaces.Integration;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Implementação do aviso sobre um <see cref="Channel{T}"/> de capacidade 1.
    /// <para>
    /// Capacidade 1 com <see cref="BoundedChannelFullMode.DropWrite"/> é o ponto central: o
    /// worker não precisa de uma mensagem por aviso, precisa saber que existe trabalho. Dez
    /// webhooks no mesmo segundo viram um único acorda-worker, e o ciclo seguinte drena as dez
    /// mensagens do banco de uma vez.
    /// </para>
    /// </summary>
    public sealed class EvolutionMessageSignal : IEvolutionMessageSignal
    {
        private readonly Channel<byte> _channel = Channel.CreateBounded<byte>(
            new BoundedChannelOptions(1)
            {
                // DropWrite serve aqui justamente pelo motivo oposto ao da fila de auditoria:
                // lá o descarte é perda de dado e precisa ser contabilizado, aqui o descarte
                // é o comportamento desejado — significa que já existe aviso pendente.
                FullMode = BoundedChannelFullMode.DropWrite,
                SingleReader = true,
                SingleWriter = false
            });

        public void Signal() => _channel.Writer.TryWrite(1);

        public async Task<bool> WaitAsync(TimeSpan timeout, CancellationToken ct)
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeoutCts.CancelAfter(timeout);

            try
            {
                if (!await _channel.Reader.WaitToReadAsync(timeoutCts.Token))
                    return false;
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                // Estourou o tempo de espera, e não o desligamento da aplicação: é a varredura
                // de segurança pedindo passagem.
                return false;
            }

            // Consome tudo que estiver pendente: o ciclo que vem a seguir já lê o backlog
            // inteiro do banco, então avisos acumulados só causariam ciclos vazios em seguida.
            while (_channel.Reader.TryRead(out _)) { }

            return true;
        }
    }
}
