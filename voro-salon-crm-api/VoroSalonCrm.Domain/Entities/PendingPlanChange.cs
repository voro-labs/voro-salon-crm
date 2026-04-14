namespace VoroSalonCrm.Domain.Entities
{
    public class PendingPlanChange
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Guid CurrentPlanId { get; set; }

        /// <summary>
        /// JSON snapshot of the current TenantSubscription at the moment the change was requested.
        /// </summary>
        public string SubscriptionSnapshot { get; set; } = string.Empty;

        public Guid RequestedPlanId { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }

        public static PendingPlanChange Create(
            Guid tenantId,
            Guid currentPlanId,
            string subscriptionSnapshot,
            Guid requestedPlanId)
        {
            var now = DateTimeOffset.UtcNow;
            return new PendingPlanChange
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                CurrentPlanId = currentPlanId,
                SubscriptionSnapshot = subscriptionSnapshot,
                RequestedPlanId = requestedPlanId,
                CreatedAt = now,
                ExpiresAt = now.AddHours(2)
            };
        }
    }
}
