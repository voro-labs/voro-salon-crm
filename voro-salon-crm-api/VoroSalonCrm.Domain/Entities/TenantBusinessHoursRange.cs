namespace VoroSalonCrm.Domain.Entities
{
    public class TenantBusinessHoursRange
    {
        public Guid Id { get; set; }
        public Guid BusinessHoursId { get; set; }
        public string OpenTime { get; set; } = "08:00";
        public string CloseTime { get; set; } = "18:00";
        public int SortOrder { get; set; } = 0;
        public TenantBusinessHours BusinessHours { get; set; } = null!;
    }
}
