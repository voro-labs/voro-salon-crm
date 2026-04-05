using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class ServicePromotion : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public Guid ServiceId { get; set; }
        public Service Service { get; set; } = null!;

        public decimal PromotionalPrice { get; set; }

        /// <summary>
        /// Days of week when the promotion applies (0=Sunday, 1=Monday, ..., 6=Saturday).
        /// Stored as a PostgreSQL integer array.
        /// </summary>
        public int[] DaysOfWeek { get; set; } = [];

        public DateOnly? ValidFrom { get; set; }
        public DateOnly? ValidUntil { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
