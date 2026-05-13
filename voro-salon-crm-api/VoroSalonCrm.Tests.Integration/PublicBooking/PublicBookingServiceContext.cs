using System.Linq.Expressions;
using MediatR;
using Moq;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.PublicBooking;

/// <summary>
/// Mounts all 16 PublicBookingService dependencies with neutral defaults.
/// Each test creates a fresh context and overrides only what the scenario needs.
/// </summary>
internal sealed class PublicBookingServiceContext
{
    public Mock<IMediator>                      Mediator            { get; } = new();
    public Mock<ITenantRepository>              TenantRepo          { get; } = new();
    public Mock<IClientRepository>             ClientRepo          { get; } = new();
    public Mock<IServiceRepository>            ServiceRepo         { get; } = new();
    public Mock<IEmployeeRepository>           EmployeeRepo        { get; } = new();
    public Mock<IAppointmentRepository>        AppointmentRepo     { get; } = new();
    public Mock<IUnitOfWork>                   UnitOfWork          { get; } = new();
    public Mock<IUserTenantRepository>         UserTenantRepo      { get; } = new();
    public Mock<IExpoPushNotificationService>  PushService         { get; } = new();
    public Mock<ITimeSlotBlockRepository>      TimeSlotBlockRepo   { get; } = new();
    public Mock<ITenantModuleRepository>       TenantModuleRepo    { get; } = new();
    public Mock<ITenantSubscriptionRepository> SubscriptionRepo    { get; } = new();
    public Mock<ITenantBusinessHoursRepository> BusinessHoursRepo  { get; } = new();
    public Mock<IServicePromotionRepository>   ServicePromotionRepo { get; } = new();
    public Mock<IClientRatingRepository>       ClientRatingRepo    { get; } = new();
    public Mock<IBookingFunnelSessionRepository> FunnelRepo        { get; } = new();
    public Mock<ICacheService>                 CacheService        { get; } = new();

    public PublicBookingServiceContext()
    {
        UnitOfWork
            .Setup(u => u.CommitAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Cache: default cache miss — set up for commonly used generic types
        CacheService
            .Setup(c => c.GetAsync<PublicTenantDto>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PublicTenantDto?)null);

        CacheService
            .Setup(c => c.GetAsync<List<PublicServiceDto>>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((List<PublicServiceDto>?)null);

        CacheService
            .Setup(c => c.GetAsync<List<PublicEmployeeDto>>(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((List<PublicEmployeeDto>?)null);

        CacheService
            .Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<PublicTenantDto>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        CacheService
            .Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<List<PublicServiceDto>>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        CacheService
            .Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<List<PublicEmployeeDto>>(), It.IsAny<TimeSpan?>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        CacheService
            .Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        PushService
            .Setup(p => p.SendToUsersAsync(
                It.IsAny<IEnumerable<Guid>>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<object?>(),
                It.IsAny<Guid?>(),
                It.IsAny<string?>(),
                It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);

        BusinessHoursRepo
            .Setup(r => r.GetByTenantAsync(It.IsAny<Guid>(), It.IsAny<bool>()))
            .ReturnsAsync(new List<TenantBusinessHours>());

        SubscriptionRepo
            .Setup(r => r.GetByTenantIdWithPlanAsync(It.IsAny<Guid>()))
            .ReturnsAsync((TenantSubscription?)null);

        UserTenantRepo
            .Setup(r => r.GetAllAsync(
                It.IsAny<Expression<Func<UserTenant, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<UserTenant>, IQueryable<UserTenant>>[]>()))
            .ReturnsAsync(new List<UserTenant>());

        SetupEmptyTimeSlotBlockQueryable();
        SetupEmptyAppointmentQueryable();
        SetupEmptyServicePromotionQueryable();
        SetupEmptyClientRatingQueryable();
        SetupEmptyFunnelQueryable();
    }

    // ── queryable helpers ──────────────────────────────────────────────────────

    public static IQueryable<T> AsyncQueryable<T>(IEnumerable<T> source)
        => new TestAsyncEnumerable<T>(source);

    public void SetupTimeSlotBlockQueryable(IEnumerable<TimeSlotBlock> blocks)
    {
        var q = AsyncQueryable(blocks);
        TimeSlotBlockRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<TimeSlotBlock, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupAppointmentQueryable(IEnumerable<Appointment> appointments)
    {
        var q = AsyncQueryable(appointments);
        AppointmentRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupServicePromotionQueryable(IEnumerable<ServicePromotion> promotions)
    {
        var q = AsyncQueryable(promotions);
        ServicePromotionRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<ServicePromotion, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupClientRatingQueryable(IEnumerable<ClientRating> ratings)
    {
        var q = AsyncQueryable(ratings);
        ClientRatingRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<ClientRating, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupFunnelQueryable(IEnumerable<BookingFunnelSession> sessions)
    {
        var q = AsyncQueryable(sessions);
        FunnelRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<BookingFunnelSession, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    private void SetupEmptyTimeSlotBlockQueryable()    => SetupTimeSlotBlockQueryable([]);
    private void SetupEmptyAppointmentQueryable()      => SetupAppointmentQueryable([]);
    private void SetupEmptyServicePromotionQueryable() => SetupServicePromotionQueryable([]);
    private void SetupEmptyClientRatingQueryable()     => SetupClientRatingQueryable([]);
    private void SetupEmptyFunnelQueryable()           => SetupFunnelQueryable([]);

    // ── factory ───────────────────────────────────────────────────────────────

    public PublicBookingService Build() => new(
        Mediator.Object,
        TenantRepo.Object,
        ClientRepo.Object,
        ServiceRepo.Object,
        EmployeeRepo.Object,
        AppointmentRepo.Object,
        UnitOfWork.Object,
        UserTenantRepo.Object,
        PushService.Object,
        TimeSlotBlockRepo.Object,
        TenantModuleRepo.Object,
        SubscriptionRepo.Object,
        BusinessHoursRepo.Object,
        ServicePromotionRepo.Object,
        ClientRatingRepo.Object,
        FunnelRepo.Object,
        CacheService.Object);
}
