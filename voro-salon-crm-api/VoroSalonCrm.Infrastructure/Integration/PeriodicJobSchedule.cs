namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Cadência compartilhada dos jobs periódicos (issue #129).
    /// <para>
    /// O problema não era a quantidade de consultas de cada job isoladamente, era o
    /// espalhamento: cada <c>BackgroundService</c> media o próprio intervalo a partir da hora
    /// em que a máquina subiu, então acordavam em instantes desencontrados e o Postgres nunca
    /// ficava ocioso tempo suficiente para suspender o compute. Três jobs de 10 minutos em
    /// fases diferentes cortam a hora em pedaços de poucos minutos, e o banco é cobrado por
    /// hora de compute acordado, não por consulta.
    /// </para>
    /// <para>
    /// Alinhando todo mundo ao mesmo relógio de parede, as consultas se agrupam numa rajada
    /// curta e o resto do intervalo fica limpo. É o silêncio contínuo entre as rajadas que
    /// permite o auto-suspend disparar.
    /// </para>
    /// </summary>
    public static class PeriodicJobSchedule
    {
        /// <summary>
        /// Grade comum dos jobs de alta frequência. Todos acordam nos múltiplos de 10 minutos
        /// da hora — :00, :10, :20 — e não a cada 10 minutos contados do próprio boot.
        /// </summary>
        public static readonly TimeSpan Grid = TimeSpan.FromMinutes(10);

        /// <summary>
        /// Quanto falta, a partir de <paramref name="now"/>, para o próximo instante alinhado
        /// a <paramref name="grid"/>.
        /// <para>
        /// Separado de <see cref="WaitForNextTickAsync"/> para ser testável sem relógio real.
        /// Quando <paramref name="now"/> cai exatamente sobre a grade, devolve um intervalo
        /// inteiro em vez de zero: devolver zero faria o laço do job girar em falso, disparando
        /// o mesmo ciclo várias vezes dentro do mesmo instante.
        /// </para>
        /// </summary>
        public static TimeSpan TimeUntilNextTick(DateTimeOffset now, TimeSpan grid)
        {
            if (grid <= TimeSpan.Zero)
                throw new ArgumentOutOfRangeException(nameof(grid), "A grade precisa ser positiva.");

            var elapsed = now.UtcTicks % grid.Ticks;

            return elapsed == 0
                ? grid
                : TimeSpan.FromTicks(grid.Ticks - elapsed);
        }

        /// <summary>
        /// Dorme até o próximo instante alinhado à grade.
        /// </summary>
        public static Task WaitForNextTickAsync(TimeSpan grid, CancellationToken ct) =>
            Task.Delay(TimeUntilNextTick(DateTimeOffset.UtcNow, grid), ct);
    }
}
