using System.Linq.Expressions;
using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.Appointments;

/// <summary>
/// Mounts all 17 AppointmentService dependencies with neutral defaults.
/// Each test creates a fresh context and overrides only what the scenario needs.
/// </summary>
internal sealed class AppointmentServiceContext
{
    public readonly Guid TenantId = Guid.NewGuid();

    public Mock<IAppointmentRepository>            AppointmentRepo         { get; } = new();
    public Mock<IServiceRecordService>             ServiceRecordService    { get; } = new();
    public Mock<IEmployeeRepository>               EmployeeRepo            { get; } = new();
    public Mock<IServiceRepository>                ServiceRepo             { get; } = new();
    public Mock<IClientMembershipRepository>       MembershipRepo          { get; } = new();
    public Mock<IUnitOfWork>                       UnitOfWork              { get; } = new();
    public Mock<ICurrentUserService>               CurrentUser             { get; } = new();
    public Mock<ITenantRepository>                 TenantRepo              { get; } = new();
    public Mock<IWhatsappService>                  WhatsappService         { get; } = new();
    public Mock<IUserTenantRepository>             UserTenantRepo          { get; } = new();
    public Mock<IExpoPushNotificationService>      PushService             { get; } = new();
    public Mock<ITimeSlotBlockService>             TimeSlotBlockService    { get; } = new();
    public Mock<ITenantBusinessHoursRepository>    BusinessHoursRepo       { get; } = new();
    public Mock<ITransactionRepository>            TransactionRepo         { get; } = new();
    public Mock<ITransactionCategoryRepository>    TransactionCategoryRepo { get; } = new();
    public IMemoryCache                            MemoryCache             { get; } = new MemoryCache(new MemoryCacheOptions());
    public Mock<ICacheService>                     CacheService            { get; } = new();
    public Mock<IMediator>                         Mediator                { get; } = new();

    public AppointmentServiceContext()
    {
        CurrentUser.Setup(u => u.TenantId).Returns(TenantId);

        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

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

        TimeSlotBlockService
            .Setup(t => t.GetOverlappingAsync(It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>()))
            .ReturnsAsync(new List<TimeSlotBlockDto>());

        BusinessHoursRepo
            .Setup(r => r.GetByTenantAsync(It.IsAny<Guid>(), It.IsAny<bool>()))
            .ReturnsAsync(new List<TenantBusinessHours>());

        UserTenantRepo
            .Setup(r => r.GetAllAsync(
                It.IsAny<Expression<Func<UserTenant, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<UserTenant>, IQueryable<UserTenant>>[]>()))
            .ReturnsAsync(new List<UserTenant>());

        ServiceRecordService
            .Setup(s => s.ExistsByAppointmentIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync(false);

        ServiceRecordService
            .Setup(s => s.DeleteByAppointmentIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync(true);

        ServiceRecordService
            .Setup(s => s.CreateAsync(It.IsAny<CreateServiceRecordDto>()))
            .ReturnsAsync(new ServiceRecordDto(
                Guid.NewGuid(), Guid.NewGuid(), null, null, null,
                DateTimeOffset.UtcNow, "stub", 0m, null, DateTimeOffset.UtcNow));

        WhatsappService
            .Setup(w => w.SendTemplateMessageAsync(
                It.IsAny<VoroSalonCrm.Application.DTOs.Integration.WhatsappTemplateMessageDto>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Default empty async queryables so methods that use Query()/Include() don't throw.
        SetupEmptyAppointmentQueryable();
        SetupEmptyEmployeeQueryable();
        SetupEmptyMembershipQueryable();
        SetupEmptyTransactionQueryable();
        SetupEmptyTransactionCategoryQueryable();
    }

    // ── queryable helpers ──────────────────────────────────────────────────────

    public static IQueryable<T> AsyncQueryable<T>(IEnumerable<T> source)
        => new TestAsyncEnumerable<T>(source);

    public void SetupAppointmentQueryable(IEnumerable<Appointment> appointments)
    {
        var q = AsyncQueryable(appointments);
        AppointmentRepo
            .Setup(r => r.Include(It.IsAny<Expression<Func<Appointment, object>>[]>()))
            .Returns(q);
        // Sobrecarga com asNoTracking, usada pela listagem paginada (issue #116).
        AppointmentRepo
            .Setup(r => r.Include(It.IsAny<bool>(), It.IsAny<Expression<Func<Appointment, object>>[]>()))
            .Returns(q);
        AppointmentRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupEmployeeQueryable(IEnumerable<Employee> employees)
    {
        var q = AsyncQueryable(employees);
        EmployeeRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Employee, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupMembershipQueryable(IEnumerable<ClientMembership> memberships)
    {
        var q = AsyncQueryable(memberships);
        MembershipRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<ClientMembership, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupTransactionCategoryQueryable(IEnumerable<TransactionCategory> categories)
    {
        var q = AsyncQueryable(categories);
        TransactionCategoryRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<TransactionCategory, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    private void SetupEmptyAppointmentQueryable()     => SetupAppointmentQueryable([]);
    private void SetupEmptyEmployeeQueryable()         => SetupEmployeeQueryable([]);
    private void SetupEmptyMembershipQueryable()       => SetupMembershipQueryable([]);
    private void SetupEmptyTransactionQueryable()
    {
        var q = AsyncQueryable<Transaction>([]);
        TransactionRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }
    private void SetupEmptyTransactionCategoryQueryable() => SetupTransactionCategoryQueryable([]);

    // ── factory ───────────────────────────────────────────────────────────────

    public VoroSalonCrm.Application.Services.AppointmentService Build() => new(
        AppointmentRepo.Object,
        ServiceRecordService.Object,
        EmployeeRepo.Object,
        ServiceRepo.Object,
        MembershipRepo.Object,
        UnitOfWork.Object,
        CurrentUser.Object,
        TenantRepo.Object,
        WhatsappService.Object,
        UserTenantRepo.Object,
        PushService.Object,
        TimeSlotBlockService.Object,
        BusinessHoursRepo.Object,
        TransactionRepo.Object,
        TransactionCategoryRepo.Object,
        MemoryCache,
        CacheService.Object,
        Mediator.Object);
}
