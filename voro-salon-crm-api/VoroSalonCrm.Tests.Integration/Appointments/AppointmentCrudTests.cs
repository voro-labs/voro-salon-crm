using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Appointments;

public class AppointmentCrudTests
{
    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_Throws_WhenTenantIdIsEmpty()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        ctx.CurrentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
        var svc = ctx.Build();

        var dto = new CreateAppointmentDto(
            ClientId          : Guid.NewGuid(),
            ServiceId         : null,
            ScheduledDateTime : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes   : 30,
            Description       : null,
            Amount            : 0,
            Notes             : null);

        // Act
        var act = () => svc.CreateAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Create_PopulatesServices_WhenServiceIdsProvided()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();

        Appointment? captured = null;
        ctx.AppointmentRepo
            .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
            .Callback<Appointment>(a =>
            {
                captured = a;
                // Set up Include to return this appointment so GetByIdAsync at the end succeeds
                ctx.SetupAppointmentQueryable([a]);
            })
            .Returns(Task.CompletedTask);

        var dto = new CreateAppointmentDto(
            ClientId          : Guid.NewGuid(),
            ServiceId         : null,
            ScheduledDateTime : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes   : 30,
            Description       : null,
            Amount            : 0,
            Notes             : null,
            ServiceIds        : [id1, id2]);

        var svc = ctx.Build();

        // Act
        await svc.CreateAsync(dto);

        // Assert
        captured.Should().NotBeNull();
        captured!.Services.Should().HaveCount(2);
        captured.Services.Select(s => s.ServiceId).Should().BeEquivalentTo(new[] { id1, id2 });
    }

    [Fact]
    public async Task Create_DoesNotThrow_WhenPushNotificationFails()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();

        ctx.PushService
            .Setup(p => p.SendToUsersAsync(
                It.IsAny<IEnumerable<Guid>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<object?>(),
                It.IsAny<Guid?>(),
                It.IsAny<string?>(),
                It.IsAny<Guid?>()))
            .ThrowsAsync(new Exception("Push service unavailable"));

        ctx.UserTenantRepo
            .Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<UserTenant, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<UserTenant>, IQueryable<UserTenant>>[]>()))
            .ReturnsAsync([new UserTenant { UserId = Guid.NewGuid(), TenantId = ctx.TenantId }]);

        ctx.AppointmentRepo
            .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
            .Callback<Appointment>(a => ctx.SetupAppointmentQueryable([a]))
            .Returns(Task.CompletedTask);

        var dto = new CreateAppointmentDto(
            ClientId          : Guid.NewGuid(),
            ServiceId         : Guid.NewGuid(),
            ScheduledDateTime : DateTimeOffset.UtcNow.AddDays(1),
            DurationMinutes   : 30,
            Description       : null,
            Amount            : 0,
            Notes             : null);

        var svc = ctx.Build();

        // Act
        var act = () => svc.CreateAsync(dto);

        // Assert — push failures must never propagate
        await act.Should().NotThrowAsync();
        ctx.UnitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
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
