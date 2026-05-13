using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Features.Appointments.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class CreateAppointmentCommandHandlerTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepo = new();
    private readonly Mock<IUnitOfWork>            _unitOfWork      = new();
    private readonly Mock<ICurrentUserService>    _currentUser     = new();
    private readonly Mock<ICacheService>          _cacheService    = new();
    private readonly Guid                         _tenantId        = Guid.NewGuid();

    public CreateAppointmentCommandHandlerTests()
    {
        _currentUser.Setup(u => u.TenantId).Returns(_tenantId);
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _cacheService.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        // GetByIdAsync returns null — handler will throw Exception("Error retrieving created appointment.")
        _appointmentRepo
            .Setup(r => r.GetByIdAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync((Appointment?)null);
    }

    private CreateAppointmentCommandHandler Build() => new(
        _appointmentRepo.Object,
        _unitOfWork.Object,
        _currentUser.Object,
        _cacheService.Object);

    [Fact]
    public async Task Handle_WhenTenantIdIsEmpty_ThrowsUnauthorized()
    {
        _currentUser.Setup(u => u.TenantId).Returns(Guid.Empty);

        var act = () => Build().Handle(
            new CreateAppointmentCommand(new CreateAppointmentDto(
                ClientId:          Guid.NewGuid(),
                ServiceId:         null,
                ScheduledDateTime: DateTimeOffset.UtcNow.AddDays(1),
                DurationMinutes:   30,
                Description:       null,
                Amount:            0,
                Notes:             null)),
            CancellationToken.None);

        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Handle_WhenServiceIdsProvided_PopulatesAppointmentServices()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();

        Appointment? captured = null;
        _appointmentRepo
            .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
            .Callback<Appointment>(a => captured = a)
            .Returns(Task.CompletedTask);

        var command = new CreateAppointmentCommand(new CreateAppointmentDto(
            ClientId:          Guid.NewGuid(),
            ServiceId:         null,
            ScheduledDateTime: DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes:   30,
            Description:       null,
            Amount:            0,
            Notes:             null,
            ServiceIds:        [id1, id2]));

        // Act — suppress the final fetch exception (GetByIdAsync returns null in test)
        try { await Build().Handle(command, CancellationToken.None); } catch { }

        // Assert
        captured.Should().NotBeNull();
        captured!.Services.Should().HaveCount(2);
        captured.Services.Select(s => s.ServiceId).Should().BeEquivalentTo(new[] { id1, id2 });
    }
}
