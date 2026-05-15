namespace VoroSalonCrm.Domain.Entities
{
    public class SupportMessage
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TicketId { get; set; }
        public string Body { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }
        public bool IsFromSupport { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

        public SupportTicket Ticket { get; set; } = null!;
    }
}
