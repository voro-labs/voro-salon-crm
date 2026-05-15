using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public class AppointmentCommissionHandler(
    IEmployeeRepository    employeeRepository,
    ITransactionRepository transactionRepository,
    IUnitOfWork            unitOfWork)
    : INotificationHandler<AppointmentCompletedNotification>
{
    public async Task Handle(AppointmentCompletedNotification notification, CancellationToken cancellationToken)
    {
        if (!notification.EmployeeId.HasValue || notification.Amount <= 0)
            return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
        var appointmentDate = DateOnly.FromDateTime(notification.ScheduledAt.UtcDateTime.AddHours(-3));
        if (appointmentDate < today)
            return;

        var employee = await employeeRepository.GetByIdAsync(true, notification.EmployeeId.Value);
        if (employee?.CommissionPercentage is not > 0)
            return;

        var appointmentIdStr = notification.AppointmentId.ToString();
        var commissionExists = await transactionRepository
            .Query(t => t.TenantId == notification.TenantId
                && t.EmployeeId == notification.EmployeeId
                && t.Notes != null && t.Notes.Contains(appointmentIdStr)
                && t.Type == TransactionType.Expense)
            .AnyAsync(cancellationToken);

        if (commissionExists)
            return;

        var commissionAmount = Math.Round(notification.Amount * (employee.CommissionPercentage!.Value / 100m), 2);
        var dueDate = new DateTimeOffset(
            notification.ScheduledAt.Year,
            notification.ScheduledAt.Month,
            DateTime.DaysInMonth(notification.ScheduledAt.Year, notification.ScheduledAt.Month),
            23, 59, 59, TimeSpan.Zero);

        await transactionRepository.AddAsync(new Transaction
        {
            Id            = Guid.NewGuid(),
            TenantId      = notification.TenantId,
            Description   = $"Comissão – {employee.Name} – {notification.ServiceName ?? "Serviço"}",
            Amount        = commissionAmount,
            PaidAmount    = 0,
            DueDate       = dueDate,
            Type          = TransactionType.Expense,
            PaymentMethod = PaymentMethod.Other,
            Status        = TransactionStatus.Pending,
            EmployeeId    = employee.Id,
            Notes         = $"Comissão de {employee.CommissionPercentage}% sobre agendamento {notification.AppointmentId}",
            CreatedAt     = DateTimeOffset.UtcNow
        });
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
