namespace VoroSalonCrm.Domain.Entities
{
    public class SubscriptionPlan
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal MonthlyPrice { get; set; }
        public decimal? PromoPrice { get; set; }
        public DateTimeOffset? PromoEndsAt { get; set; }
        public int MaxEmployees { get; set; }       // -1 = ilimitado
        public int MaxClients { get; set; }         // -1 = ilimitado
        public bool HasEmployees { get; set; }
        public bool HasAnamnesis { get; set; }
        public bool HasFinancial { get; set; }
        public bool HasReports { get; set; }
        public bool HasBooking { get; set; }
        public bool HasWhatsAppBot { get; set; }
        public int SortOrder { get; set; }
        public int DefaultTrialDays { get; set; } = 7;
        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
