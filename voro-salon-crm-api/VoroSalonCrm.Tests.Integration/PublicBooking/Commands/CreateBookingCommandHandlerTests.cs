using System.Linq.Expressions;
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Features.PublicBooking.Commands;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.PublicBooking.Commands;

public class CreateBookingCommandHandlerTests
{
    private static IQueryable<T> AsyncQueryable<T>(IEnumerable<T> source)
        => new TestAsyncEnumerable<T>(source);

    private static CreateBookingCommandHandler BuildHandler(
        Mock<ITenantRepository> tenantRepo,
        Mock<IServiceRepository> serviceRepo,
        Mock<IServicePromotionRepository> servicePromotionRepo,
        Mock<IClientRepository> clientRepo,
        Mock<IAppointmentRepository> appointmentRepo,
        Mock<IUnitOfWork> unitOfWork,
        Mock<IUserTenantRepository> userTenantRepo,
        Mock<IExpoPushNotificationService> pushService)
        => new(
            tenantRepo.Object,
            serviceRepo.Object,
            servicePromotionRepo.Object,
            clientRepo.Object,
            appointmentRepo.Object,
            unitOfWork.Object,
            userTenantRepo.Object,
            pushService.Object);

    // ── Test 1: tenant not found ───────────────────────────────────────────────

    [Fact]
    public async Task Handle_WhenTenantNotFound_ReturnsFailure()
    {
        // Arrange
        var tenantRepo           = new Mock<ITenantRepository>();
        var serviceRepo          = new Mock<IServiceRepository>();
        var servicePromotionRepo = new Mock<IServicePromotionRepository>();
        var clientRepo           = new Mock<IClientRepository>();
        var appointmentRepo      = new Mock<IAppointmentRepository>();
        var unitOfWork           = new Mock<IUnitOfWork>();
        var userTenantRepo       = new Mock<IUserTenantRepository>();
        var pushService          = new Mock<IExpoPushNotificationService>();

        tenantRepo.Setup(r => r.GetBySlugAsync(It.IsAny<string>())).ReturnsAsync((Tenant?)null);

        var handler = BuildHandler(tenantRepo, serviceRepo, servicePromotionRepo, clientRepo, appointmentRepo, unitOfWork, userTenantRepo, pushService);

        var dto = new PublicBookingCreateDto
        {
            TenantSlug        = "nonexistent",
            ClientName        = "Test Client",
            ClientPhone       = "11999990000",
            ScheduledDateTime = DateTimeOffset.UtcNow.AddDays(1),
        };

        // Act
        var result = await handler.Handle(new CreateBookingCommand(dto), CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("não encontrado");
    }

    // ── Test 2: service not found ─────────────────────────────────────────────

    [Fact]
    public async Task Handle_WhenServiceNotFound_ReturnsFailure()
    {
        // Arrange
        var tenantId  = Guid.NewGuid();
        var serviceId = Guid.NewGuid();

        var tenantRepo           = new Mock<ITenantRepository>();
        var serviceRepo          = new Mock<IServiceRepository>();
        var servicePromotionRepo = new Mock<IServicePromotionRepository>();
        var clientRepo           = new Mock<IClientRepository>();
        var appointmentRepo      = new Mock<IAppointmentRepository>();
        var unitOfWork           = new Mock<IUnitOfWork>();
        var userTenantRepo       = new Mock<IUserTenantRepository>();
        var pushService          = new Mock<IExpoPushNotificationService>();

        tenantRepo
            .Setup(r => r.GetBySlugAsync("my-salon"))
            .ReturnsAsync(new Tenant { Id = tenantId, Name = "My Salon", Slug = "my-salon", IsActive = true });

        serviceRepo
            .Setup(r => r.GetPublicByIdAsync(tenantId, serviceId))
            .ReturnsAsync((Service?)null);

        var handler = BuildHandler(tenantRepo, serviceRepo, servicePromotionRepo, clientRepo, appointmentRepo, unitOfWork, userTenantRepo, pushService);

        var dto = new PublicBookingCreateDto
        {
            TenantSlug        = "my-salon",
            ClientName        = "Test Client",
            ClientPhone       = "11999990000",
            ServiceId         = serviceId,
            ScheduledDateTime = DateTimeOffset.UtcNow.AddDays(1),
        };

        // Act
        var result = await handler.Handle(new CreateBookingCommand(dto), CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Serviço não encontrado");
    }

    // ── Test 3: client exists, no conflict → creates appointment and returns success ─

    [Fact]
    public async Task Handle_WhenClientExistsAndNoConflict_CreatesAppointmentAndReturnsSuccess()
    {
        // Arrange
        var tenantId  = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var clientId  = Guid.NewGuid();

        var tenantRepo           = new Mock<ITenantRepository>();
        var serviceRepo          = new Mock<IServiceRepository>();
        var servicePromotionRepo = new Mock<IServicePromotionRepository>();
        var clientRepo           = new Mock<IClientRepository>();
        var appointmentRepo      = new Mock<IAppointmentRepository>();
        var unitOfWork           = new Mock<IUnitOfWork>();
        var userTenantRepo       = new Mock<IUserTenantRepository>();
        var pushService          = new Mock<IExpoPushNotificationService>();

        tenantRepo
            .Setup(r => r.GetBySlugAsync("my-salon"))
            .ReturnsAsync(new Tenant { Id = tenantId, Name = "My Salon", Slug = "my-salon", IsActive = true });

        serviceRepo
            .Setup(r => r.GetPublicByIdAsync(tenantId, serviceId))
            .ReturnsAsync(new Service { Id = serviceId, TenantId = tenantId, Name = "Corte", DurationMinutes = 60, Price = 100m });

        servicePromotionRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<ServicePromotion, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncQueryable(Array.Empty<ServicePromotion>()));

        clientRepo
            .Setup(r => r.GetByPhoneAsync(tenantId, "11999990000"))
            .ReturnsAsync(new Client { Id = clientId, TenantId = tenantId, Name = "Existing Client", Phone = "11999990000" });

        appointmentRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncQueryable(Array.Empty<Appointment>()));

        appointmentRepo
            .Setup(r => r.AddAsync(It.IsAny<Appointment>()))
            .Returns(Task.CompletedTask);

        appointmentRepo
            .Setup(r => r.AddAppointmentServiceAsync(It.IsAny<Domain.Entities.AppointmentService>()))
            .Returns(Task.CompletedTask);

        unitOfWork
            .Setup(u => u.CommitAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        userTenantRepo
            .Setup(r => r.GetAllAsync(
                It.IsAny<Expression<Func<UserTenant, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<UserTenant>, IQueryable<UserTenant>>[]>()))
            .ReturnsAsync(new List<UserTenant>());

        pushService
            .Setup(p => p.SendToUsersAsync(
                It.IsAny<IEnumerable<Guid>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<object?>(),
                It.IsAny<Guid?>(),
                It.IsAny<string?>(),
                It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);

        var handler = BuildHandler(tenantRepo, serviceRepo, servicePromotionRepo, clientRepo, appointmentRepo, unitOfWork, userTenantRepo, pushService);

        var dto = new PublicBookingCreateDto
        {
            TenantSlug        = "my-salon",
            ClientName        = "Existing Client",
            ClientPhone       = "11999990000",
            ServiceId         = serviceId,
            ScheduledDateTime = DateTimeOffset.UtcNow.AddDays(1),
        };

        // Act
        var result = await handler.Handle(new CreateBookingCommand(dto), CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();

        appointmentRepo.Verify(r => r.AddAsync(It.IsAny<Appointment>()), Times.Once);
        appointmentRepo.Verify(r => r.AddAppointmentServiceAsync(It.IsAny<Domain.Entities.AppointmentService>()), Times.Once);
        unitOfWork.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.AtLeast(1));
    }
}
