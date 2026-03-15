using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class AnamnesisQuestion : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }

        public string Identifier { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string? Placeholder { get; set; }
        public AnamnesisFieldType FieldType { get; set; }
        public string? Options { get; set; } // JSON string for options list
        public AnamnesisSection Section { get; set; }
        public int Order { get; set; }
        public bool IsRequired { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
