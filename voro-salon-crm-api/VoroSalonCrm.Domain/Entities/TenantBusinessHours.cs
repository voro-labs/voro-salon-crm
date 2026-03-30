namespace VoroSalonCrm.Domain.Entities
{
    public class TenantBusinessHours
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public int DayOfWeek { get; set; } // 0=Sunday, 1=Monday, ..., 6=Saturday
        public bool IsOpen { get; set; } = true;
        public string OpenTime { get; set; } = "08:00"; // HH:mm format
        public string CloseTime { get; set; } = "18:00"; // HH:mm format
        public Tenant Tenant { get; set; } = null!;
    }
}
