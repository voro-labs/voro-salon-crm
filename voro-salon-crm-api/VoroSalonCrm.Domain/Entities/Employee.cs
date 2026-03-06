using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class Employee : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public string Name { get; set; } = string.Empty;
        public string? PhotoUrl { get; set; }
        public DateTimeOffset HireDate { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? TerminationDate { get; set; }
        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }

        // Navigation property for specialized services
        public ICollection<EmployeeService> Specialties { get; set; } = new List<EmployeeService>();
    }
}
