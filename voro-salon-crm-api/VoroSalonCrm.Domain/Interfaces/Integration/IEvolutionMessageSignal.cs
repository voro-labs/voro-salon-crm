namespace VoroSalonCrm.Domain.Interfaces.Integration
{
    /// <summary>
    /// Aviso em memória de que chegou mensagem inbound para o bot da Evolution processar.
    /// <para>
    /// Antes o <c>EvolutionResponseWorker</c> varria <c>WhatsAppMessages</c> a cada 5 segundos
    /// para descobrir se havia trabalho — 17 mil consultas por dia, quase todas voltando vazias,
    /// e cada uma impedindo o Postgres de suspender o compute (issue #129). Agora quem grava a
    /// mensagem avisa, e o worker dorme enquanto não há nada a fazer.
    /// </para>
    /// <para>
    /// O aviso é por processo: um webhook atendido por outra máquina não acorda este worker.
    /// Quem cobre esse caso é a varredura de segurança do worker, em intervalo longo.
    /// </para>
    /// </summary>
    public interface IEvolutionMessageSignal
    {
        /// <summary>
        /// Avisa que há mensagem nova. Não bloqueia e nunca falha: avisos concorrentes se
        /// fundem num só, porque o worker drena o backlog inteiro a cada ciclo.
        /// </summary>
        void Signal();

        /// <summary>
        /// Espera por um aviso, desistindo depois de <paramref name="timeout"/>.
        /// </summary>
        /// <returns><c>true</c> se houve aviso; <c>false</c> se estourou o tempo.</returns>
        Task<bool> WaitAsync(TimeSpan timeout, CancellationToken ct);
    }
}
