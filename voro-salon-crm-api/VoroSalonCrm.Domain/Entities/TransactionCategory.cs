using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class TransactionCategory : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }

        public string Name { get; set; } = string.Empty;
        public TransactionType Type { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
