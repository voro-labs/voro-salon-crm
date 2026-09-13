using FluentAssertions;
using VoroSalonCrm.Infrastructure.Integration;

namespace VoroSalonCrm.Tests.Integration.Infrastructure;

/// <summary>
/// Cobre a grade compartilhada dos jobs periódicos (issue #129). O que importa aqui não é a
/// precisão do relógio, é a propriedade que gera a economia: dois jobs que subiram em momentos
/// diferentes têm que convergir para o mesmo instante de acordar.
/// </summary>
public class PeriodicJobScheduleTests
{
    private static readonly TimeSpan TenMinutes = TimeSpan.FromMinutes(10);

    private static DateTimeOffset At(int hour, int minute, int second = 0, int ms = 0) =>
        new(2026, 9, 13, hour, minute, second, ms, TimeSpan.Zero);

    [Theory]
    [InlineData(10, 3, 0, 7)]    // 10:03 -> 10:10
    [InlineData(10, 9, 59, 1)]   // quase na grade
    [InlineData(10, 11, 0, 9)]   // logo depois de um tick
    [InlineData(10, 55, 0, 5)]   // atravessa a virada da hora
    public void TimeUntilNextTick_LandsExactlyOnTheGrid(int hour, int minute, int second, int expectedMinutes)
    {
        var now = At(hour, minute, second);

        var wait = PeriodicJobSchedule.TimeUntilNextTick(now, TenMinutes);
        var wakeUp = now + wait;

        wakeUp.Minute.Should().Be(wakeUp.Minute / 10 * 10);
        wakeUp.Second.Should().Be(0);
        wakeUp.Millisecond.Should().Be(0);

        // O segundo é descontado da espera, então o minuto cheio só fecha quando second == 0.
        wait.TotalMinutes.Should().BeApproximately(
            expectedMinutes - (second / 60.0), 0.001);
    }

    [Fact]
    public void TimeUntilNextTick_WhenAlreadyOnTheGrid_ReturnsFullIntervalNotZero()
    {
        // Devolver zero faria o laço do job girar em falso: ele acabou de rodar o ciclo, e uma
        // espera de zero dispararia o ciclo seguinte no mesmo instante, em looping.
        var wait = PeriodicJobSchedule.TimeUntilNextTick(At(10, 20), TenMinutes);

        wait.Should().Be(TenMinutes);
    }

    [Fact]
    public void TimeUntilNextTick_ForJobsStartedAtDifferentTimes_ConvergesToTheSameInstant()
    {
        // Este é o teste que descreve a economia: os jobs sobem juntos no boot, mas cada um
        // termina seu primeiro ciclo num momento diferente. Se cada um contasse 10 minutos a
        // partir daí, ficariam em fases distintas e picotariam a ociosidade do Postgres.
        var reminderFinishedAt = At(10, 2, 13);
        var checkoutFinishedAt = At(10, 4, 47);
        var pendingFinishedAt = At(10, 7, 59);

        var wakeUps = new[] { reminderFinishedAt, checkoutFinishedAt, pendingFinishedAt }
            .Select(t => t + PeriodicJobSchedule.TimeUntilNextTick(t, TenMinutes))
            .Distinct()
            .ToList();

        wakeUps.Should().ContainSingle().Which.Should().Be(At(10, 10));
    }

    [Fact]
    public void TimeUntilNextTick_NeverExceedsTheGrid()
    {
        // Garante que nenhum instante do dia produz uma espera maior que a grade — um job não
        // pode pular um ciclo inteiro por causa do alinhamento.
        for (var minute = 0; minute < 60; minute++)
        {
            for (var second = 0; second < 60; second += 7)
            {
                var wait = PeriodicJobSchedule.TimeUntilNextTick(At(10, minute, second), TenMinutes);

                wait.Should().BePositive();
                wait.Should().BeLessThanOrEqualTo(TenMinutes);
            }
        }
    }

    [Fact]
    public void TimeUntilNextTick_WithNonPositiveGrid_Throws()
    {
        var act = () => PeriodicJobSchedule.TimeUntilNextTick(At(10, 0), TimeSpan.Zero);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }
}
