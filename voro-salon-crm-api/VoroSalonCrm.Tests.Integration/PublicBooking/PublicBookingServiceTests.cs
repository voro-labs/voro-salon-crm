using FluentAssertions;
using MediatR;
using Moq;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Features.PublicBooking.Commands;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Tests.Integration.PublicBooking;

public class PublicBookingServiceTests
{
    // ── GetTenantBySlugAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetTenantBySlug_ReturnsNull_WhenTenantNotFound()
    {
        // Arrange
        var ctx = new PublicBookingServiceContext();

        // Cache miss already configured by default
        ctx.CacheService
            .Setup(c => c.GetAsync<PublicTenantDto>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PublicTenantDto?)null);

        ctx.TenantRepo
            .Setup(r => r.GetBySlugAsync(It.IsAny<string>()))
            .ReturnsAsync((Tenant?)null);

        var svc = ctx.Build();

        // Act
        var result = await svc.GetTenantBySlugAsync("unknown-slug");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetTenantBySlug_ReturnsFromCache_WhenCached()
    {
        // Arrange
        var ctx = new PublicBookingServiceContext();
        var cached = new PublicTenantDto(
            Guid.NewGuid(),
            "Cached Salon",
            "cached-salon",
            null,
            null,
            null,
            null,
            null,
            true
        );

        ctx.CacheService
            .Setup(c => c.GetAsync<PublicTenantDto>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cached);

        var svc = ctx.Build();

        // Act
        var result = await svc.GetTenantBySlugAsync("cached-salon");

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Cached Salon");

        ctx.TenantRepo.Verify(r => r.GetBySlugAsync(It.IsAny<string>()), Times.Never);
    }

    // ── CreateBookingAsync — façade delegates to MediatR ──────────────────────

    [Fact]
    public async Task CreateBooking_ReturnsFailure_WhenTenantNotFound()
    {
        // Arrange
        var ctx = new PublicBookingServiceContext();
        var dto = new PublicBookingCreateDto
        {
            TenantSlug        = "nonexistent",
            ClientName        = "Test Client",
            ClientPhone       = "11999990000",
            ScheduledDateTime = DateTimeOffset.UtcNow.AddDays(1),
        };

        ctx.Mediator
            .Setup(m => m.Send(It.IsAny<CreateBookingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PublicBookingResponseDto(false, "Estabelecimento não encontrado.", null));

        var svc = ctx.Build();

        // Act
        var result = await svc.CreateBookingAsync(dto);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("não encontrado");
        ctx.Mediator.Verify(m => m.Send(It.IsAny<CreateBookingCommand>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateBooking_ReturnsFailure_WhenServiceNotFound()
    {
        // Arrange
        var ctx = new PublicBookingServiceContext();
        var serviceId = Guid.NewGuid();

        var dto = new PublicBookingCreateDto
        {
            TenantSlug        = "meu-salao",
            ClientName        = "Test Client",
            ClientPhone       = "11999990000",
            ServiceId         = serviceId,
            ScheduledDateTime = DateTimeOffset.UtcNow.AddDays(1),
        };

        ctx.Mediator
            .Setup(m => m.Send(It.IsAny<CreateBookingCommand>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PublicBookingResponseDto(false, $"Serviço não encontrado: {serviceId}.", null));

        var svc = ctx.Build();

        // Act
        var result = await svc.CreateBookingAsync(dto);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Serviço não encontrado");
        ctx.Mediator.Verify(m => m.Send(It.IsAny<CreateBookingCommand>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
