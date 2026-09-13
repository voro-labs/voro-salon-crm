using FluentAssertions;
using System.Diagnostics;
using VoroSalonCrm.Infrastructure.Integration;

namespace VoroSalonCrm.Tests.Integration.Infrastructure;

/// <summary>
/// Cobre o contrato que substituiu o polling de 5 segundos do bot da Evolution (issue #129):
/// o worker precisa acordar na hora quando chega mensagem, e precisa dormir de verdade
/// quando não chega nada — é dormir que deixa o compute do Postgres suspender.
/// </summary>
public class EvolutionMessageSignalTests
{
    private static readonly TimeSpan ShortTimeout = TimeSpan.FromMilliseconds(200);

    [Fact]
    public async Task WaitAsync_WhenSignalledBefore_ReturnsImmediately()
    {
        var signal = new EvolutionMessageSignal();

        // Webhook chegou enquanto o worker ainda processava o ciclo anterior: o aviso precisa
        // ficar pendente, senão a mensagem só sairia na varredura de segurança.
        signal.Signal();

        var stopwatch = Stopwatch.StartNew();
        var signalled = await signal.WaitAsync(TimeSpan.FromSeconds(30), CancellationToken.None);
        stopwatch.Stop();

        signalled.Should().BeTrue();
        stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task WaitAsync_WhenSignalledWhileWaiting_WakesUp()
    {
        var signal = new EvolutionMessageSignal();

        var waiting = signal.WaitAsync(TimeSpan.FromSeconds(30), CancellationToken.None);
        signal.Signal();

        (await waiting).Should().BeTrue();
    }

    [Fact]
    public async Task WaitAsync_WithoutSignal_TimesOutInsteadOfReturningTrue()
    {
        var signal = new EvolutionMessageSignal();

        var signalled = await signal.WaitAsync(ShortTimeout, CancellationToken.None);

        // false é o que manda o worker fazer a varredura de segurança. Se aqui voltasse true,
        // o worker rodaria um ciclo vazio a cada volta e o polling teria voltado disfarçado.
        signalled.Should().BeFalse();
    }

    [Fact]
    public async Task Signal_WhenCalledRepeatedly_CoalescesIntoSingleWakeUp()
    {
        var signal = new EvolutionMessageSignal();

        // Rajada de webhooks: o worker lê o backlog inteiro do banco num ciclo só, então dez
        // avisos não podem virar dez ciclos — nove deles achariam a fila já vazia.
        for (var i = 0; i < 10; i++)
            signal.Signal();

        (await signal.WaitAsync(ShortTimeout, CancellationToken.None)).Should().BeTrue();
        (await signal.WaitAsync(ShortTimeout, CancellationToken.None)).Should().BeFalse();
    }

    [Fact]
    public async Task WaitAsync_WhenCancelled_ThrowsSoTheWorkerCanShutDown()
    {
        var signal = new EvolutionMessageSignal();
        using var cts = new CancellationTokenSource();

        var waiting = signal.WaitAsync(TimeSpan.FromSeconds(30), cts.Token);
        await cts.CancelAsync();

        // Desligamento tem que propagar: o worker trata OperationCanceledException saindo do
        // laço. Confundir desligamento com estouro de tempo faria a aplicação demorar a parar.
        await FluentActions.Awaiting(() => waiting)
            .Should().ThrowAsync<OperationCanceledException>();
    }
}
