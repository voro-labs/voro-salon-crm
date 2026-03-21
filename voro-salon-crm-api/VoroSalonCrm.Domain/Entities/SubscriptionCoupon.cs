namespace VoroSalonCrm.Domain.Entities
{
    public class SubscriptionCoupon
    {
        public Guid Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int TrialDays { get; set; } = 7;
        public bool IsActive { get; set; } = true;
        public int? MaxUses { get; set; }
        public int UsedCount { get; set; } = 0;
        public DateTimeOffset? ExpiresAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
