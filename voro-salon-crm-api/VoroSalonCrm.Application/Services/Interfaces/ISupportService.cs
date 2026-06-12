using VoroSalonCrm.Application.DTOs.Support;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ISupportService
    {
        Task<SupportTicketDto> CreateTicketAsync(CreateSupportTicketDto dto);
        Task<IEnumerable<SupportTicketDto>> GetTicketsAsync();
        Task<IEnumerable<SupportMessageDto>> GetMessagesAsync(Guid ticketId);
        Task<SupportMessageDto> SendMessageAsync(Guid ticketId, SendSupportMessageDto dto);
        Task<IEnumerable<SupportTicketDto>> GetAllTicketsAsync();
        Task<IEnumerable<SupportMessageDto>> GetMessagesForOwnerAsync(Guid ticketId);
        Task<SupportMessageDto> ReplyAsSupportAsync(Guid ticketId, SendSupportMessageDto dto);
        Task<SupportTicketDto> UpdateTicketStatusAsync(Guid ticketId, string status);
    }
}
