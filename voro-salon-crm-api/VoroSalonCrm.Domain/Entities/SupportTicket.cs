using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Domain.Entities
{
    public class SupportTicket
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }
        public string Title { get; set; } = string.Empty;
        public SupportTicketCategory Category { get; set; }
        public bool IsUrgent { get; set; }
        public SupportTicketStatus Status { get; set; } = SupportTicketStatus.Open;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public ICollection<SupportMessage> Messages { get; set; } = new List<SupportMessage>();
    }
}
