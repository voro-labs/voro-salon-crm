using FluentAssertions;
using MediatR;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Features.Appointments.Commands;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Appointments;

public class AppointmentCrudTests
{
    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_DelegatesToMediator()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var dto = new CreateAppointmentDto(
            ClientId          : Guid.NewGuid(),
            ServiceId         : null,
            ScheduledDateTime : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes   : 30,
            Description       : null,
            Amount            : 0,
            Notes             : null);

        ctx.Mediator
            .Setup(m => m.Send(It.IsAny<CreateAppointmentCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppointmentDto(
                Guid.NewGuid(), dto.ClientId, "Test", null,
                null, null, dto.ScheduledDateTime, 30,
                AppointmentStatus.Confirmed, null, 0, null,
                DateTimeOffset.UtcNow));

        var svc = ctx.Build();

        // Act
        await svc.CreateAsync(dto);

        // Assert — facade must forward to MediatR
        ctx.Mediator.Verify(
            m => m.Send(It.Is<CreateAppointmentCommand>(c => c.Dto == dto), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_Throws_WhenAppointmentNotFound()
    {
        // Arrange — appointment repo returns nothing (default empty queryable)
        var ctx = new AppointmentServiceContext();
        var svc = ctx.Build();

        // Act
        var act = () => svc.UpdateAsync(Guid.NewGuid(), new UpdateAppointmentDto());

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task Update_CreatesServiceRecord_WhenStatusTransitionsToCompleted()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var appt = new Appointment
        {
            Id                = Guid.NewGuid(),
            TenantId          = ctx.TenantId,
            ClientId          = Guid.NewGuid(),
            ScheduledDateTime = DateTimeOffset.UtcNow.AddDays(1),
            Status            = AppointmentStatus.Pending,
            Amount            = 0,
            IsDeleted         = false,
            Services          = []
        };

        ctx.SetupAppointmentQueryable([appt]);
        var svc = ctx.Build();

        var dto = new UpdateAppointmentDto { Status = AppointmentStatus.Completed };

        // Act
        await svc.UpdateAsync(appt.Id, dto);

        // Assert
        ctx.ServiceRecordService.Verify(
            s => s.CreateAsync(It.IsAny<CreateServiceRecordDto>()),
            Times.Once);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_ReturnsFalse_WhenAppointmentNotFound()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        ctx.AppointmentRepo
            .Setup(r => r.GetByIdAsync(false, It.IsAny<object[]>()))
            .ReturnsAsync((Appointment?)null);

        var svc = ctx.Build();

        // Act
        var result = await svc.DeleteAsync(Guid.NewGuid());

        // Assert
        result.Should().BeFalse();
        ctx.UnitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Delete_SoftDeletes_WhenAppointmentExists()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var appt = new Appointment
        {
            Id       = Guid.NewGuid(),
            TenantId = ctx.TenantId,
            IsDeleted = false
        };

        ctx.AppointmentRepo
            .Setup(r => r.GetByIdAsync(false, appt.Id))
            .ReturnsAsync(appt);

        Appointment? updated = null;
        ctx.AppointmentRepo
            .Setup(r => r.Update(It.IsAny<Appointment>()))
            .Callback<Appointment>(a => updated = a);

        var svc = ctx.Build();

        // Act
        var result = await svc.DeleteAsync(appt.Id);

        // Assert
        result.Should().BeTrue();
        updated.Should().NotBeNull();
        updated!.IsDeleted.Should().BeTrue();
        updated.DeletedAt.Should().NotBeNull();
        ctx.UnitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
