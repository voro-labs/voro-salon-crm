using FluentAssertions;
using MediatR;
using Moq;
using VoroSalonCrm.Application.Features.Appointments.Commands;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class UpdateAppointmentStatusCommandHandlerTests
{
    private readonly Mock<IAppointmentRepository> _appointmentRepo = new();
    private readonly Mock<IUnitOfWork>            _unitOfWork      = new();
    private readonly Mock<ICacheService>          _cacheService    = new();
    private readonly Mock<IMediator>              _mediator        = new();
    private readonly Mock<IServiceRecordService>  _serviceRecord   = new();

    public UpdateAppointmentStatusCommandHandlerTests()
    {
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);
        _cacheService.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _mediator.Setup(m => m.Publish(It.IsAny<INotification>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        _serviceRecord.Setup(s => s.DeleteByAppointmentIdAsync(It.IsAny<Guid>())).ReturnsAsync(true);
    }

    private UpdateAppointmentStatusCommandHandler Build() => new(
        _appointmentRepo.Object,
        _unitOfWork.Object,
        _cacheService.Object,
        _mediator.Object,
        _serviceRecord.Object);

    private void SetupAppointmentRepo(Appointment? appointment) =>
        _appointmentRepo
            .Setup(r => r.GetByIdAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(appointment);

    [Fact]
    public async Task Handle_WhenAppointmentNotFound_ReturnsFalse()
    {
        SetupAppointmentRepo(null);

        var result = await Build().Handle(
            new UpdateAppointmentStatusCommand(Guid.NewGuid(), AppointmentStatus.Completed),
            CancellationToken.None);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task Handle_WhenStatusChangesToCompleted_PublishesNotification()
    {
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(), TenantId = Guid.NewGuid(),
            ClientId = Guid.NewGuid(),
            Status = AppointmentStatus.Confirmed, Amount = 100m
        };
        SetupAppointmentRepo(appointment);

        var result = await Build().Handle(
            new UpdateAppointmentStatusCommand(appointment.Id, AppointmentStatus.Completed),
            CancellationToken.None);

        result.Should().BeTrue();
        _mediator.Verify(m => m.Publish(
            It.IsAny<AppointmentCompletedNotification>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenAlreadyCompleted_DoesNotPublishNotification()
    {
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(), TenantId = Guid.NewGuid(),
            Status = AppointmentStatus.Completed, Amount = 100m
        };
        SetupAppointmentRepo(appointment);

        await Build().Handle(
            new UpdateAppointmentStatusCommand(appointment.Id, AppointmentStatus.Completed),
            CancellationToken.None);

        _mediator.Verify(m => m.Publish(
            It.IsAny<AppointmentCompletedNotification>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenRevertedFromCompleted_DeletesServiceRecordAndSaves()
    {
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(), TenantId = Guid.NewGuid(),
            Status = AppointmentStatus.Completed, Amount = 100m
        };
        SetupAppointmentRepo(appointment);

        await Build().Handle(
            new UpdateAppointmentStatusCommand(appointment.Id, AppointmentStatus.Cancelled),
            CancellationToken.None);

        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _cacheService.Verify(c => c.RemoveAsync(
            $"dashboard:tenant:{appointment.TenantId}",
            It.IsAny<CancellationToken>()), Times.Once);
        _serviceRecord.Verify(s => s.DeleteByAppointmentIdAsync(appointment.Id), Times.Once);
    }
}
