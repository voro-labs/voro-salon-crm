namespace VoroSalonCrm.Domain.Entities
{
    public class TenantBusinessHours
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public int DayOfWeek { get; set; } // 0=Sunday, 1=Monday, ..., 6=Saturday
        public bool IsOpen { get; set; } = true;
        public Tenant Tenant { get; set; } = null!;
        public ICollection<TenantBusinessHoursRange> Ranges { get; set; } = [];
    }
}
