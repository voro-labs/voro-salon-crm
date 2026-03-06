namespace VoroSalonCrm.Domain.Entities
{
    public class EmployeeService
    {
        public Guid EmployeeId { get; set; }
        public Employee Employee { get; set; } = null!;

        public Guid ServiceId { get; set; }
        public Service Service { get; set; } = null!;
    }
}
