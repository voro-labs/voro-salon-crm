using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class UserNotification : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public Guid? RelatedEntityId { get; set; }
        public bool IsRead { get; set; } = false;
        public DateTimeOffset CreatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
