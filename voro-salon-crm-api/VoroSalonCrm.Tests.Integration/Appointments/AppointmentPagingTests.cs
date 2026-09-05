using FluentAssertions;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Appointments;

/// <summary>
/// Cobre a listagem paginada depois que ela saiu da memória e foi para o IQueryable
/// (issue #116). Os testes olham página, total e ordem: são exatamente as três coisas
/// que voltariam a quebrar se Skip/Take ou o Count fossem parar depois do ToList.
/// </summary>
public class AppointmentPagingTests
{
    private static readonly DateTimeOffset Start = new(2026, 9, 1, 9, 0, 0, TimeSpan.Zero);

    private static Appointment Make(string clientName, DateTimeOffset when, string? description = null) => new()
    {
        Id = Guid.NewGuid(),
        ClientId = Guid.NewGuid(),
        Client = new Client { Name = clientName },
        ScheduledDateTime = when,
        DurationMinutes = 30,
        Status = AppointmentStatus.Confirmed,
        Description = description
    };

    [Fact]
    public async Task GetPaged_ReturnsOnlyTheRequestedPage()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        ctx.SetupAppointmentQueryable(Enumerable.Range(0, 25)
            .Select(i => Make($"Cliente {i:00}", Start.AddMinutes(i * 30)))
            .ToList());

        var svc = ctx.Build();

        // Act
        var result = await svc.GetPagedAsync(page: 2, pageSize: 10, search: null);

        // Assert
        result.Items.Should().HaveCount(10);
        result.TotalCount.Should().Be(25);
        result.Items.First().ClientName.Should().Be("Cliente 10");
        result.Items.Last().ClientName.Should().Be("Cliente 19");
    }

    [Fact]
    public async Task GetPaged_TotalCount_ReflectsTheFilter_NotThePage()
    {
        // Arrange: 12 registros, dos quais 3 batem com a busca.
        var ctx = new AppointmentServiceContext();
        var appointments = Enumerable.Range(0, 12)
            .Select(i => Make($"Cliente {i:00}", Start.AddMinutes(i * 30)))
            .ToList();
        appointments[2].Client!.Name = "Maria Souza";
        appointments[5].Client!.Name = "Mariana Lima";
        appointments[9].Description = "retorno da maria";

        ctx.SetupAppointmentQueryable(appointments);
        var svc = ctx.Build();

        // Act
        var result = await svc.GetPagedAsync(page: 1, pageSize: 2, search: "MARIA");

        // Assert: a página traz 2, mas o total precisa contar os 3 que passaram no filtro —
        // se o Count voltasse a ser feito sobre a página, viria 2 e a navegação sumiria.
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task GetPaged_DoesNotRepeatRecords_WhenScheduleTimesAreIdentical()
    {
        // Arrange: todos no mesmo horário. Sem critério de desempate estável, Skip/Take
        // pode devolver o mesmo registro em páginas diferentes.
        var ctx = new AppointmentServiceContext();
        ctx.SetupAppointmentQueryable(Enumerable.Range(0, 10)
            .Select(i => Make($"Cliente {i:00}", Start))
            .ToList());

        var svc = ctx.Build();

        // Act
        var first = await svc.GetPagedAsync(page: 1, pageSize: 5, search: null);
        var second = await svc.GetPagedAsync(page: 2, pageSize: 5, search: null);

        // Assert
        var ids = first.Items.Select(i => i.Id).Concat(second.Items.Select(i => i.Id)).ToList();
        ids.Should().OnlyHaveUniqueItems();
        ids.Should().HaveCount(10);
    }
}
