using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class ServiceRecord : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }

        public Guid ClientId { get; set; }
        public Client Client { get; set; } = null!;

        public Guid? ServiceId { get; set; }
        public Service? Service { get; set; }

        public DateTimeOffset ServiceDate { get; set; } = DateTime.UtcNow;
        public string Description { get; set; } = string.Empty;
        public decimal Amount { get; set; } = 0;
        public string? Notes { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
