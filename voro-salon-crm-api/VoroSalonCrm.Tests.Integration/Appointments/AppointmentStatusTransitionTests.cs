using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Appointments;

public class AppointmentStatusTransitionTests
{
    private Appointment MakeAppointment(AppointmentStatus status, Client? client = null) => new()
    {
        Id                = Guid.NewGuid(),
        TenantId          = Guid.NewGuid(),
        ClientId          = Guid.NewGuid(),
        ScheduledDateTime = DateTimeOffset.UtcNow.AddDays(1),
        DurationMinutes   = 30,
        Status            = status,
        Amount            = 0,   // avoids transaction side-effects by default
        IsDeleted         = false,
        Client            = client
    };

    [Fact]
    public async Task UpdateStatus_CreatesServiceRecord_WhenTransitionToCompleted()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var appt = MakeAppointment(AppointmentStatus.Pending);
        ctx.SetupAppointmentQueryable([appt]);
        var svc = ctx.Build();

        // Act
        var result = await svc.UpdateStatusAsync(appt.Id, AppointmentStatus.Completed);

        // Assert
        result.Should().BeTrue();
        ctx.ServiceRecordService.Verify(
            s => s.CreateAsync(It.IsAny<CreateServiceRecordDto>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_DecrementsRemainingSession_WhenClientHasActiveMembership()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var appt = MakeAppointment(AppointmentStatus.Pending);

        var membership = new ClientMembership
        {
            Id                = Guid.NewGuid(),
            TenantId          = appt.TenantId,
            ClientId          = appt.ClientId,
            Status            = ClientMembershipStatus.Active,
            RemainingSessions = 3,
            EndDate           = DateTimeOffset.UtcNow.AddMonths(1),
            Plan              = new ClientMembershipPlan { Name = "Plano Mensal" }
        };

        ctx.SetupAppointmentQueryable([appt]);
        ctx.SetupMembershipQueryable([membership]);

        ClientMembership? updated = null;
        ctx.MembershipRepo
            .Setup(r => r.Update(It.IsAny<ClientMembership>()))
            .Callback<ClientMembership>(m => updated = m);

        var svc = ctx.Build();

        // Act
        await svc.UpdateStatusAsync(appt.Id, AppointmentStatus.Completed);

        // Assert
        updated.Should().NotBeNull();
        updated!.RemainingSessions.Should().Be(2);
    }

    [Fact]
    public async Task UpdateStatus_DeletesServiceRecord_WhenTransitionFromCompleted_ToCancelled()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var appt = MakeAppointment(AppointmentStatus.Completed);
        ctx.SetupAppointmentQueryable([appt]);
        var svc = ctx.Build();

        // Act
        var result = await svc.UpdateStatusAsync(appt.Id, AppointmentStatus.Cancelled);

        // Assert
        result.Should().BeTrue();
        ctx.ServiceRecordService.Verify(
            s => s.DeleteByAppointmentIdAsync(appt.Id),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_DeletesServiceRecord_WhenTransitionFromCompleted_ToPending()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var appt = MakeAppointment(AppointmentStatus.Completed);
        ctx.SetupAppointmentQueryable([appt]);
        var svc = ctx.Build();

        // Act
        await svc.UpdateStatusAsync(appt.Id, AppointmentStatus.Pending);

        // Assert
        ctx.ServiceRecordService.Verify(
            s => s.DeleteByAppointmentIdAsync(appt.Id),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_NoSideEffect_WhenStatusDoesNotChange()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var appt = MakeAppointment(AppointmentStatus.Confirmed);
        ctx.SetupAppointmentQueryable([appt]);
        var svc = ctx.Build();

        // Act
        await svc.UpdateStatusAsync(appt.Id, AppointmentStatus.Confirmed);

        // Assert
        ctx.ServiceRecordService.Verify(s => s.CreateAsync(It.IsAny<CreateServiceRecordDto>()), Times.Never);
        ctx.ServiceRecordService.Verify(s => s.DeleteByAppointmentIdAsync(It.IsAny<Guid>()), Times.Never);
    }

    [Fact]
    public async Task UpdateStatus_ReturnsFalse_WhenAppointmentNotFound()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        // AppointmentRepo returns empty by default (no appointment with matching Id)
        var svc = ctx.Build();

        // Act
        var result = await svc.UpdateStatusAsync(Guid.NewGuid(), AppointmentStatus.Confirmed);

        // Assert
        result.Should().BeFalse();
        ctx.UnitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateStatus_SkipsWhatsApp_WhenTenantDisabledBooking()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var client = new Client { Id = Guid.NewGuid(), Phone = "5511999990000", Name = "Ana" };
        var appt   = MakeAppointment(AppointmentStatus.Pending, client);
        ctx.SetupAppointmentQueryable([appt]);

        ctx.TenantRepo
            .Setup(r => r.GetByIdAsync(false, appt.TenantId))
            .ReturnsAsync(new Tenant { Id = appt.TenantId, Name = "Salão", UseWhatsappBooking = false });

        var svc = ctx.Build();

        // Act
        await svc.UpdateStatusAsync(appt.Id, AppointmentStatus.Confirmed);

        // Assert
        ctx.WhatsappService.Verify(
            w => w.SendTemplateMessageAsync(
                It.IsAny<VoroSalonCrm.Application.DTOs.Integration.WhatsappTemplateMessageDto>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateStatus_SkipsWhatsApp_WhenAntiSpamCacheIsActive()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();
        var client = new Client { Id = Guid.NewGuid(), Phone = "5511999990000", Name = "Ana" };
        var appt   = MakeAppointment(AppointmentStatus.Pending, client);
        ctx.SetupAppointmentQueryable([appt]);

        ctx.TenantRepo
            .Setup(r => r.GetByIdAsync(false, appt.TenantId))
            .ReturnsAsync(new Tenant
            {
                Id                  = appt.TenantId,
                Name                = "Salão",
                UseWhatsappBooking  = true,
                WhatsappPhoneNumberId = "123"
            });

        // Pre-seed the anti-spam cache key
        var cacheKey = $"wa_status_{appt.Id}_{AppointmentStatus.Confirmed}";
        ctx.MemoryCache.Set(cacheKey, true);

        var svc = ctx.Build();

        // Act
        await svc.UpdateStatusAsync(appt.Id, AppointmentStatus.Confirmed);

        // Assert — WhatsApp must not be called because the cache already holds the key
        ctx.WhatsappService.Verify(
            w => w.SendTemplateMessageAsync(
                It.IsAny<VoroSalonCrm.Application.DTOs.Integration.WhatsappTemplateMessageDto>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
