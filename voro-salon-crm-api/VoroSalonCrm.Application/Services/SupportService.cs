using VoroSalonCrm.Application.DTOs.Support;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class SupportService(
        ISupportTicketRepository ticketRepository,
        ISupportMessageRepository messageRepository,
        ICurrentUserService currentUserService,
        IUnitOfWork unitOfWork) : ISupportService
    {
        public async Task<SupportTicketDto> CreateTicketAsync(CreateSupportTicketDto dto)
        {
            var tenantId = currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant inválido ou não encontrado no contexto.");

            if (!Enum.TryParse<SupportTicketCategory>(dto.Category, true, out var category))
                throw new ArgumentException($"Categoria inválida. Use: Bug, Feature ou Other.");

            var ticket = new SupportTicket
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Title = dto.Title,
                Category = category,
                IsUrgent = dto.IsUrgent,
                Status = SupportTicketStatus.Open,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await ticketRepository.AddAsync(ticket);
            await unitOfWork.SaveChangesAsync();

            return new SupportTicketDto(
                ticket.Id, ticket.TenantId, ticket.Title,
                ticket.Category, ticket.IsUrgent, ticket.Status,
                ticket.CreatedAt, 0, null);
        }

        public async Task<IEnumerable<SupportTicketDto>> GetTicketsAsync()
        {
            var tenantId = currentUserService.TenantId;
            var tickets = await ticketRepository.GetByTenantIdAsync(tenantId);
            return tickets.Select(t => new SupportTicketDto(
                t.Id, t.TenantId, t.Title, t.Category, t.IsUrgent, t.Status,
                t.CreatedAt, t.Messages.Count,
                t.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Body));
        }

        public async Task<IEnumerable<SupportMessageDto>> GetMessagesAsync(Guid ticketId)
        {
            var tenantId = currentUserService.TenantId;

            var ticket = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            if (ticket.TenantId != tenantId)
                throw new UnauthorizedAccessException("Acesso negado.");

            var messages = await messageRepository.GetByTicketIdAsync(ticketId);
            return messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new SupportMessageDto(
                    m.Id, m.TicketId, m.Body, m.AttachmentUrl, m.IsFromSupport, m.CreatedAt));
        }

        public async Task<SupportMessageDto> SendMessageAsync(Guid ticketId, SendSupportMessageDto dto)
        {
            var tenantId = currentUserService.TenantId;

            var ticket = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            if (ticket.TenantId != tenantId)
                throw new UnauthorizedAccessException("Acesso negado.");

            if (ticket.Status == SupportTicketStatus.Closed)
                throw new InvalidOperationException("Ticket encerrado.");

            var message = new SupportMessage
            {
                Id = Guid.NewGuid(),
                TicketId = ticketId,
                Body = dto.Body,
                AttachmentUrl = dto.AttachmentUrl,
                IsFromSupport = false,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await messageRepository.AddAsync(message);
            ticket.UpdatedAt = DateTimeOffset.UtcNow;
            ticketRepository.Update(ticket);
            await unitOfWork.SaveChangesAsync();

            return new SupportMessageDto(
                message.Id, message.TicketId, message.Body,
                message.AttachmentUrl, message.IsFromSupport, message.CreatedAt);
        }

        public async Task<IEnumerable<SupportTicketDto>> GetAllTicketsAsync()
        {
            var rows = await ticketRepository.GetAllWithTenantNameAsync();
            return rows.Select(r => new SupportTicketDto(
                r.Ticket.Id, r.Ticket.TenantId, r.Ticket.Title, r.Ticket.Category,
                r.Ticket.IsUrgent, r.Ticket.Status, r.Ticket.CreatedAt,
                r.Ticket.Messages.Count,
                r.Ticket.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Body,
                r.TenantName));
        }

        public async Task<IEnumerable<SupportMessageDto>> GetMessagesForOwnerAsync(Guid ticketId)
        {
            _ = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            var messages = await messageRepository.GetByTicketIdAsync(ticketId);
            return messages
                .OrderBy(m => m.CreatedAt)
                .Select(m => new SupportMessageDto(
                    m.Id, m.TicketId, m.Body, m.AttachmentUrl, m.IsFromSupport, m.CreatedAt));
        }

        public async Task<SupportMessageDto> ReplyAsSupportAsync(Guid ticketId, SendSupportMessageDto dto)
        {
            var ticket = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            var message = new SupportMessage
            {
                Id = Guid.NewGuid(),
                TicketId = ticketId,
                Body = dto.Body,
                AttachmentUrl = dto.AttachmentUrl,
                IsFromSupport = true,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await messageRepository.AddAsync(message);
            ticket.UpdatedAt = DateTimeOffset.UtcNow;
            ticketRepository.Update(ticket);
            await unitOfWork.SaveChangesAsync();

            return new SupportMessageDto(
                message.Id, message.TicketId, message.Body,
                message.AttachmentUrl, message.IsFromSupport, message.CreatedAt);
        }

        public async Task<SupportTicketDto> UpdateTicketStatusAsync(Guid ticketId, string status)
        {
            var ticket = await ticketRepository.GetByIdAsync(true, ticketId)
                ?? throw new KeyNotFoundException("Ticket não encontrado.");

            if (!Enum.TryParse<SupportTicketStatus>(status, true, out var parsed))
                throw new ArgumentException("Status inválido. Use: Open, InProgress ou Closed.");

            ticket.Status = parsed;
            ticket.UpdatedAt = DateTimeOffset.UtcNow;
            ticketRepository.Update(ticket);
            await unitOfWork.SaveChangesAsync();

            return new SupportTicketDto(
                ticket.Id, ticket.TenantId, ticket.Title, ticket.Category,
                ticket.IsUrgent, ticket.Status, ticket.CreatedAt,
                ticket.Messages.Count,
                ticket.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault()?.Body,
                null);
        }
    }
}
