using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Features.Appointments.Notifications;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.Appointments.Commands;

public class AppointmentCommissionHandlerTests
{
    private readonly Mock<IEmployeeRepository>    _employeeRepo    = new();
    private readonly Mock<ITransactionRepository> _transactionRepo = new();
    private readonly Mock<IUnitOfWork>            _unitOfWork      = new();

    public AppointmentCommissionHandlerTests()
    {
        _unitOfWork.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(0);

        // Default: empty transaction queryable
        _transactionRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<Transaction>(Enumerable.Empty<Transaction>()));
    }

    private AppointmentCommissionHandler Build() => new(
        _employeeRepo.Object,
        _transactionRepo.Object,
        _unitOfWork.Object);

    private AppointmentCompletedNotification MakeNotification(
        Guid? employeeId = null, decimal amount = 200m, Guid? appointmentId = null) =>
        new(
            AppointmentId: appointmentId ?? Guid.NewGuid(),
            TenantId:      Guid.NewGuid(),
            ClientId:      Guid.NewGuid(),
            ServiceId:     null,
            EmployeeId:    employeeId,
            Amount:        amount,
            ScheduledAt:   DateTimeOffset.UtcNow,
            ServiceName:   "Corte");

    [Fact]
    public async Task Handle_WhenEmployeeHasNoCommission_DoesNotCreateTransaction()
    {
        var employee = new Employee { Id = Guid.NewGuid(), CommissionPercentage = null };
        _employeeRepo.Setup(r => r.GetByIdAsync(true, employee.Id)).ReturnsAsync(employee);

        await Build().Handle(MakeNotification(employeeId: employee.Id), CancellationToken.None);

        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenNoEmployeeId_DoesNotCreateTransaction()
    {
        await Build().Handle(MakeNotification(employeeId: null), CancellationToken.None);

        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenCommissionAlreadyExists_SkipsDuplicate()
    {
        var appointmentId = Guid.NewGuid();
        var employee = new Employee { Id = Guid.NewGuid(), CommissionPercentage = 10m, Name = "Ana" };
        _employeeRepo.Setup(r => r.GetByIdAsync(true, employee.Id)).ReturnsAsync(employee);

        _transactionRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<Transaction>(new List<Transaction>
            {
                new() { Id = Guid.NewGuid(), Notes = appointmentId.ToString(), Type = TransactionType.Expense }
            }));

        await Build().Handle(MakeNotification(employeeId: employee.Id, appointmentId: appointmentId), CancellationToken.None);

        _transactionRepo.Verify(r => r.AddAsync(It.IsAny<Transaction>()), Times.Never);
    }

    [Fact]
    public async Task Handle_WhenEmployeeHasCommission_CreatesExpenseTransaction()
    {
        var employee = new Employee { Id = Guid.NewGuid(), CommissionPercentage = 10m, Name = "Ana" };
        _employeeRepo.Setup(r => r.GetByIdAsync(true, employee.Id)).ReturnsAsync(employee);

        // Empty queryable — no existing commission
        _transactionRepo
            .Setup(r => r.Query(It.IsAny<System.Linq.Expressions.Expression<Func<Transaction, bool>>>(), It.IsAny<bool>()))
            .Returns(new TestAsyncEnumerable<Transaction>(Enumerable.Empty<Transaction>()));

        Transaction? captured = null;
        _transactionRepo
            .Setup(r => r.AddAsync(It.IsAny<Transaction>()))
            .Callback<Transaction>(t => captured = t)
            .Returns(Task.CompletedTask);

        await Build().Handle(MakeNotification(employeeId: employee.Id), CancellationToken.None);

        captured.Should().NotBeNull();
        captured!.Amount.Should().Be(20m);
        captured.Type.Should().Be(TransactionType.Expense);
        captured.EmployeeId.Should().Be(employee.Id);
    }
}
