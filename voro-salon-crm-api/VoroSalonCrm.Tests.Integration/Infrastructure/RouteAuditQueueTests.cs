using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Infrastructure.Auditing;

namespace VoroSalonCrm.Tests.Integration.Infrastructure;

/// <summary>
/// Cobre a garantia central da fila de auditoria (issue #115): ela nunca bloqueia a
/// requisição nem cresce sem limite, mesmo se o writer parar de drenar.
/// </summary>
public class RouteAuditQueueTests
{
    private static RouteAuditQueue Build(int capacity) =>
        new(NullLogger<RouteAuditQueue>.Instance, capacity);

    private static RouteAuditLog Log(string path) => new()
    {
        Method     = "GET",
        Path       = path,
        StatusCode = 200,
        Timestamp  = DateTime.UtcNow
    };

    [Fact]
    public void TryEnqueue_WhenBelowCapacity_AcceptsAndPreservesOrder()
    {
        var queue = Build(capacity: 4);

        queue.TryEnqueue(Log("/a")).Should().BeTrue();
        queue.TryEnqueue(Log("/b")).Should().BeTrue();

        queue.Reader.TryRead(out var first).Should().BeTrue();
        queue.Reader.TryRead(out var second).Should().BeTrue();

        first!.Path.Should().Be("/a");
        second!.Path.Should().Be("/b");
    }

    [Fact]
    public void TryEnqueue_WhenFull_DropsInsteadOfGrowingOrThrowing()
    {
        var queue = Build(capacity: 2);

        queue.TryEnqueue(Log("/1")).Should().BeTrue();
        queue.TryEnqueue(Log("/2")).Should().BeTrue();

        // Writer parado: a partir daqui tudo é descartado, sem exceção e sem acumular.
        queue.TryEnqueue(Log("/3")).Should().BeFalse();
        queue.TryEnqueue(Log("/4")).Should().BeFalse();

        var drained = 0;
        while (queue.Reader.TryRead(out _)) drained++;

        drained.Should().Be(2, "a fila é limitada — o excedente é descartado, não enfileirado");
    }

    [Fact]
    public void TryEnqueue_TruncatesFieldsToColumnLimits()
    {
        var queue = Build(capacity: 4);

        queue.TryEnqueue(new RouteAuditLog
        {
            Method     = "GET",
            Path       = "/" + new string('x', 900),   // coluna aceita 500
            IPAddress  = new string('9', 300),          // coluna aceita 100
            StatusCode = 200,
            Timestamp  = DateTime.UtcNow
        }).Should().BeTrue();

        queue.Reader.TryRead(out var log).Should().BeTrue();

        // Sem isto, uma única URL longa faria o SaveChanges do lote inteiro falhar,
        // derrubando junto até 199 registros sem relação com o problema.
        log!.Path.Should().HaveLength(500);
        log.IPAddress.Should().HaveLength(100);
        log.Method.Should().Be("GET", "valores dentro do limite passam intactos");
    }

    [Fact]
    public void TryEnqueue_IsNonBlocking_ForManyConcurrentWriters()
    {
        var queue = Build(capacity: 50);

        // Simula várias requisições concorrentes enfileirando ao mesmo tempo.
        // O que importa é não lançar e não travar — descarte é aceitável.
        var act = () => Parallel.For(0, 500, i => queue.TryEnqueue(Log($"/{i}")));

        act.Should().NotThrow();

        var drained = 0;
        while (queue.Reader.TryRead(out _)) drained++;

        drained.Should().BeLessThanOrEqualTo(50);
    }
}
