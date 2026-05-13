using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class AppointmentTransactionHandlerTests
{
    private readonly Mock<ITransactionRepository>         _transactionRepo         = new();
    private readonly Mock<ITransactionCategoryRepository> _transactionCategoryRepo = new();
    private readonly Mock<IUnitOfWork>                    _unitOfWork              = new();

    public AppointmentTransactionHandlerTests()
    {
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);

        // Default: empty category queryable
        _transactionCategoryRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<TransactionCategory, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<TransactionCategory>(Enumerable.Empty<TransactionCategory>()));

        // Default: empty transaction queryable (no existing income — idempotency check passes)
        _transactionRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<Transaction>(Enumerable.Empty<Transaction>()));

        _transactionCategoryRepo.Setup(r => r.AddAsync(It.IsAny<TransactionCategory>())).Returns(Task.CompletedTask);
        _transactionRepo.Setup(r => r.AddAsync(It.IsAny<Transaction>())).Returns(Task.CompletedTask);
    }

    private AppointmentTransactionHandler Build() => new(
        _transactionRepo.Object,
        _transactionCategoryRepo.Object,
        _unitOfWork.Object);

    private AppointmentCompletedNotification MakeNotification(decimal amount = 150m) =>
        new(
            AppointmentId: Guid.NewGuid(),
            TenantId:      Guid.NewGuid(),
            ClientId:      Guid.NewGuid(),
            ServiceId:     null,
            EmployeeId:    null,
            Amount:        amount,
            ScheduledAt:   DateTimeOffset.UtcNow,
            ServiceName:   "Hidratação",
            ClientName:    "Maria");

    [Fact]
    public async Task Handle_WhenAmountIsZero_DoesNotCreateTransaction()
    {
        await Build().Handle(MakeNotification(amount: 0m), CancellationToken.None);

        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenCategoryExists_UsesExistingCategory()
    {
        var tenantId = Guid.NewGuid();
        var existing = new TransactionCategory
        {
            Id       = Guid.NewGuid(),
            TenantId = tenantId,
            Name     = "Serviços",
            Type     = TransactionType.Income
        };

        _transactionCategoryRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<TransactionCategory, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<TransactionCategory>(new List<TransactionCategory> { existing }));

        Transaction? captured = null;
        _transactionRepo
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .Callback<Transaction>(t => captured = t)
            .Returns(Task.CompletedTask);

        var n = new AppointmentCompletedNotification(
            AppointmentId: Guid.NewGuid(), TenantId: tenantId, ClientId: Guid.NewGuid(),
            ServiceId: null, EmployeeId: null, Amount: 150m, ScheduledAt: DateTimeOffset.UtcNow,
            ServiceName: "Hidratação", ClientName: "Maria");

        await Build().Handle(n, CancellationToken.None);

        captured!.CategoryId.Should().Be(existing.Id);
        _transactionCategoryRepo.Verify(r => r.AddAsync(It.IsAny<TransactionCategory>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenCategoryDoesNotExist_CreatesCategory()
    {
        _transactionCategoryRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<TransactionCategory, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<TransactionCategory>(Enumerable.Empty<TransactionCategory>()));

        await Build().Handle(MakeNotification(), CancellationToken.None);

        _transactionCategoryRepo.Verify(r => r.AddAsync(It.IsAny<TransactionCategory>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenTransactionAlreadyExists_SkipsDuplicate()
    {
        var appointmentId = Guid.NewGuid();

        _transactionRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<Transaction>(new List<Transaction>
            {
                new() { Notes = appointmentId.ToString(), Type = TransactionType.Income }
            }));

        var n = new AppointmentCompletedNotification(
            AppointmentId: appointmentId, TenantId: Guid.NewGuid(), ClientId: Guid.NewGuid(),
            ServiceId: null, EmployeeId: null, Amount: 150m, ScheduledAt: DateTimeOffset.UtcNow,
            ServiceName: "Corte", ClientName: "Ana");

        await Build().Handle(n, CancellationToken.None);

        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }
}
