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
        IWhatsAppConversationRepository conversationRepository,
        IUnitOfWork unitOfWork) : IWhatsAppMessageService
    {
        public async Task SaveInboundAsync(Guid tenantId, string from, string to, string body, string? whatsAppMessageId = null)
        {
            // Verificação rápida antes de tentar inserir (reduz conflitos sob carga normal)
            if (!string.IsNullOrEmpty(whatsAppMessageId))
            {
                var exists = await repository
                    .Query(m => m.WhatsAppMessageId == whatsAppMessageId)
                    .AnyAsync();
                if (exists) return;
            }
            else
            {
                // Sem ID: deduplicar por remetente+corpo numa janela de 30s
                // (protege contra webhooks duplicados do Evolution quando info.ID é null)
                var recentCutoff = DateTimeOffset.UtcNow.AddSeconds(-30);
                var exists = await repository
                    .Query(m => m.TenantId == tenantId
                             && m.From == from
                             && m.Body == body
                             && m.Direction == "inbound"
                             && m.Timestamp >= recentCutoff)
                    .AnyAsync();
                if (exists) return;
            }

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

            try
            {
                await repository.AddAsync(message);
                await unitOfWork.SaveChangesAsync();
            }
            catch (DbUpdateException) when (!string.IsNullOrEmpty(whatsAppMessageId))
            {
                // Unique constraint violation: webhook duplicado chegou no mesmo instante — ignorar silenciosamente
            }
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

        public async Task<IEnumerable<WhatsAppMessageDto>> GetByPhoneAsync(Guid tenantId, string phone, int page = 1, int pageSize = 100)
        {
            var messages = await repository
                .Query(m => m.TenantId == tenantId && (m.From == phone || m.To == phone))
                .OrderBy(m => m.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new WhatsAppMessageDto(
                    m.Id, m.TenantId, m.Direction,
                    m.From, m.To, m.Body,
                    m.WhatsAppMessageId, m.Status, m.Timestamp))
                .ToListAsync();

            return messages;
        }

        public async Task<IEnumerable<WhatsAppConversationDto>> GetConversationsAsync(Guid tenantId)
        {
            var conversations = await conversationRepository
                .Query(c => c.TenantId == tenantId && c.DeletedAt == null)
                .OrderByDescending(c => c.LastMessageAt)
                .Select(c => new WhatsAppConversationDto(
                    c.Id, c.PhoneNumber, c.ContactName, c.State,
                    c.LastMessageBody, c.LastMessageAt, c.AppointmentId, null))
                .ToListAsync();

            return conversations;
        }

        public async Task DeleteByPhoneAsync(Guid tenantId, string phone)
        {
            var messages = await repository
                .Query(m => m.TenantId == tenantId && (m.From == phone || m.To == phone))
                .ToListAsync();

            foreach (var m in messages)
                repository.Delete(m);

            var conversations = await conversationRepository
                .Query(c => c.TenantId == tenantId && c.PhoneNumber == phone)
                .ToListAsync();

            foreach (var c in conversations)
                conversationRepository.Delete(c);

            if (messages.Count > 0 || conversations.Count > 0)
                await unitOfWork.SaveChangesAsync();
        }
    }
}
