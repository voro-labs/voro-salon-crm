using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class Client : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }

        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Notes { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
