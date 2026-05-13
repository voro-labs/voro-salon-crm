using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Features.Appointments.Commands;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Appointments;

/// <summary>
/// Verifica que AppointmentService.UpdateStatusAsync é uma façade MediatR.
/// O comportamento real (criação de histórico, comissão, cache) está testado em
/// UpdateAppointmentStatusCommandHandlerTests.
/// </summary>
public class AppointmentStatusTransitionTests
{
    [Fact]
    public async Task UpdateStatus_DelegatesToMediator_WithCorrectCommand()
    {
        // Arrange
        var ctx   = new AppointmentServiceContext();
        var id    = Guid.NewGuid();
        var status = AppointmentStatus.Completed;

        ctx.Mediator
            .Setup(m => m.Send(It.IsAny<UpdateAppointmentStatusCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var svc = ctx.Build();

        // Act
        var result = await svc.UpdateStatusAsync(id, status);

        // Assert
        result.Should().BeTrue();
        ctx.Mediator.Verify(
            m => m.Send(
                It.Is<UpdateAppointmentStatusCommand>(c => c.AppointmentId == id && c.Status == status),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_ReturnsFalse_WhenMediatorReturnsFalse()
    {
        // Arrange
        var ctx = new AppointmentServiceContext();

        ctx.Mediator
            .Setup(m => m.Send(It.IsAny<UpdateAppointmentStatusCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var svc = ctx.Build();

        // Act
        var result = await svc.UpdateStatusAsync(Guid.NewGuid(), AppointmentStatus.Confirmed);

        // Assert
        result.Should().BeFalse();
    }
}
