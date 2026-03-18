namespace VoroSalonCrm.Domain.Entities
{
    public class SubscriptionPlan
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal MonthlyPrice { get; set; }
        public int MaxEmployees { get; set; }       // -1 = ilimitado
        public int MaxClients { get; set; }         // -1 = ilimitado
        public bool HasAnamnesis { get; set; }
        public bool HasFinancial { get; set; }
        public bool HasReports { get; set; }
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
