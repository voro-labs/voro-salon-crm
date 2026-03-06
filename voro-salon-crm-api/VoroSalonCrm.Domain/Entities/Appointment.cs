using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class Appointment : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }

        public Guid ClientId { get; set; }
        public Client Client { get; set; } = null!;

        public Guid? ServiceId { get; set; }
        public Service? Service { get; set; }

        public Guid? EmployeeId { get; set; }
        public Employee? Employee { get; set; }

        public DateTimeOffset ScheduledDateTime { get; set; }
        public int DurationMinutes { get; set; } = 30;
        public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;

        public string? Description { get; set; }
        public decimal Amount { get; set; }
        public string? Notes { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
