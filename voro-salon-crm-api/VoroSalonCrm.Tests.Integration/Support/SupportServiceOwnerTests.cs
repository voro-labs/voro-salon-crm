using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Support;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Tests.Integration.Support;

public class SupportServiceOwnerTests
{
    private readonly Mock<ISupportTicketRepository> _ticketRepo = new();
    private readonly Mock<ISupportMessageRepository> _messageRepo = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly Mock<IUnitOfWork> _unitOfWork = new();

    private SupportService Build() => new(
        _ticketRepo.Object,
        _messageRepo.Object,
        _currentUser.Object,
        _unitOfWork.Object);

    [Fact]
    public async Task GetAllTicketsAsync_ReturnsTicketsFromMultipleTenants_WithTenantName()
    {
        // Arrange
        var t1 = new SupportTicket { Id = Guid.NewGuid(), TenantId = Guid.NewGuid(), Title = "A" };
        var t2 = new SupportTicket { Id = Guid.NewGuid(), TenantId = Guid.NewGuid(), Title = "B" };
        _ticketRepo
            .Setup(r => r.GetAllWithTenantNameAsync())
            .ReturnsAsync(new List<(SupportTicket, string)>
            {
                (t1, "Salon One"),
                (t2, "Salon Two"),
            });
        var svc = Build();

        // Act
        var result = (await svc.GetAllTicketsAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
        result.Select(r => r.TenantName).Should().BeEquivalentTo(new[] { "Salon One", "Salon Two" });
    }

    [Fact]
    public async Task ReplyAsSupportAsync_SetsIsFromSupportTrue_EvenWhenClosed()
    {
        // Arrange
        var ticketId = Guid.NewGuid();
        var ticket = new SupportTicket { Id = ticketId, Status = SupportTicketStatus.Closed };
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(ticket);
        var svc = Build();
        var dto = new SendSupportMessageDto(ticketId, "Hello from support", null);

        // Act
        var result = await svc.ReplyAsSupportAsync(ticketId, dto);

        // Assert
        result.IsFromSupport.Should().BeTrue();
        ticket.UpdatedAt.Should().NotBeNull();
        _messageRepo.Verify(r => r.AddAsync(It.Is<SupportMessage>(m => m.IsFromSupport)), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UpdateTicketStatusAsync_PersistsTransition_AndTouchesUpdatedAt()
    {
        // Arrange
        var ticketId = Guid.NewGuid();
        var ticket = new SupportTicket { Id = ticketId, Status = SupportTicketStatus.Open };
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(ticket);
        var svc = Build();

        // Act
        var result = await svc.UpdateTicketStatusAsync(ticketId, "InProgress");

        // Assert
        ticket.Status.Should().Be(SupportTicketStatus.InProgress);
        ticket.UpdatedAt.Should().NotBeNull();
        result.Status.Should().Be(SupportTicketStatus.InProgress);
        _ticketRepo.Verify(r => r.Update(ticket), Times.Once);
        _unitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ReplyAsSupportAsync_Throws_WhenTicketNotFound()
    {
        // Arrange
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync((SupportTicket?)null);
        var svc = Build();
        var dto = new SendSupportMessageDto(Guid.NewGuid(), "Hi", null);

        // Act
        var act = () => svc.ReplyAsSupportAsync(dto.TicketId, dto);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [Fact]
    public async Task UpdateTicketStatusAsync_Throws_WhenStatusInvalid()
    {
        // Arrange
        var ticket = new SupportTicket { Id = Guid.NewGuid(), Status = SupportTicketStatus.Open };
        _ticketRepo
            .Setup(r => r.GetByIdAsync(It.IsAny<bool>(), It.IsAny<object[]>()))
            .ReturnsAsync(ticket);
        var svc = Build();

        // Act
        var act = () => svc.UpdateTicketStatusAsync(ticket.Id, "Bogus");

        // Assert
        await act.Should().ThrowAsync<ArgumentException>();
    }
}
