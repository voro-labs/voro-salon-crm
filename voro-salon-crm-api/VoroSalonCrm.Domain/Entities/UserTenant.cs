using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Domain.Entities
{
    public class UserTenant
    {
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public bool IsDefault { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
