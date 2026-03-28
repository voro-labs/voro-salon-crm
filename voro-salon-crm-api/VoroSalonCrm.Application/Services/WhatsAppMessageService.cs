using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class WhatsAppMessageService(
        IWhatsAppMessageRepository repository,
        IUnitOfWork unitOfWork) : IWhatsAppMessageService
    {
        public async Task SaveInboundAsync(Guid tenantId, string from, string to, string body, string? whatsAppMessageId = null)
        {
            var message = new WhatsAppMessage
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Direction = "inbound",
                From = from,
                To = to,
                Body = body,
                WhatsAppMessageId = whatsAppMessageId,
                Status = "received",
                Timestamp = DateTimeOffset.UtcNow
            };

            await repository.AddAsync(message);
            await unitOfWork.SaveChangesAsync();
        }

        public async Task SaveOutboundAsync(Guid tenantId, string from, string to, string body, string? whatsAppMessageId = null)
        {
            var message = new WhatsAppMessage
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Direction = "outbound",
                From = from,
                To = to,
                Body = body,
                WhatsAppMessageId = whatsAppMessageId,
                Status = "sent",
                Timestamp = DateTimeOffset.UtcNow
            };

            await repository.AddAsync(message);
            await unitOfWork.SaveChangesAsync();
        }

        public async Task<IEnumerable<WhatsAppMessageDto>> GetByTenantAsync(Guid tenantId, int page = 1, int pageSize = 50)
        {
            var messages = await repository
                .Query(m => m.TenantId == tenantId)
                .OrderByDescending(m => m.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new WhatsAppMessageDto(
                    m.Id, m.TenantId, m.Direction,
                    m.From, m.To, m.Body,
                    m.WhatsAppMessageId, m.Status, m.Timestamp))
                .ToListAsync();

            return messages;
        }
    }
}
