using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Features.Appointments.Notifications;

public class AppointmentTransactionHandler(
    ITransactionRepository         transactionRepository,
    ITransactionCategoryRepository transactionCategoryRepository,
    IUnitOfWork                    unitOfWork)
    : INotificationHandler<AppointmentCompletedNotification>
{
    public async Task Handle(AppointmentCompletedNotification notification, CancellationToken cancellationToken)
    {
        if (notification.Amount <= 0)
            return;

        // Idempotência: evita duplicata se a notificação for publicada mais de uma vez
        var appointmentIdStr = notification.AppointmentId.ToString();
        var incomeExists = await transactionRepository
            .Query(t => t.TenantId == notification.TenantId
                && t.Notes != null && t.Notes.Contains(appointmentIdStr)
                && t.Type == TransactionType.Income)
            .AnyAsync(cancellationToken);

        if (incomeExists)
            return;

        var servicosCategory = await transactionCategoryRepository
            .Query(c => c.TenantId == notification.TenantId
                && c.Name == "Serviços"
                && c.Type == TransactionType.Income
                && !c.IsDeleted, asNoTracking: false)
            .FirstOrDefaultAsync(cancellationToken);

        if (servicosCategory == null)
        {
            servicosCategory = new TransactionCategory
            {
                Id        = Guid.NewGuid(),
                TenantId  = notification.TenantId,
                Name      = "Serviços",
                Type      = TransactionType.Income,
                IsActive  = true,
                CreatedAt = DateTimeOffset.UtcNow
            };
            await transactionCategoryRepository.AddAsync(servicosCategory);
        }

        await transactionRepository.AddAsync(new Transaction
        {
            Id            = Guid.NewGuid(),
            TenantId      = notification.TenantId,
            CategoryId    = servicosCategory.Id,
            Description   = $"{notification.ServiceName ?? "Serviço"} - {notification.ClientName ?? "Cliente"}",
            Amount        = notification.Amount,
            PaidAmount    = notification.Amount,
            DueDate       = notification.ScheduledAt,
            PaymentDate   = notification.ScheduledAt,
            Type          = TransactionType.Income,
            PaymentMethod = PaymentMethod.Other,
            Status        = TransactionStatus.Paid,
            Notes         = $"Receita gerada automaticamente — Agendamento {notification.AppointmentId}",
            CreatedAt     = DateTimeOffset.UtcNow
        });
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
