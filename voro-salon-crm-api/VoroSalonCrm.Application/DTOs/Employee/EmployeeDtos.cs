namespace VoroSalonCrm.Application.DTOs.Employee
{
    public record EmployeeDto
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string? PhotoUrl { get; init; }
        public DateTimeOffset HireDate { get; init; }
        public bool IsActive { get; init; }
        public decimal? CommissionPercentage { get; init; }
        public bool HasAccess { get; init; }
        public Guid? UserId { get; init; }
        public List<Guid> SpecialtyIds { get; init; } = new();
    }

    public record CreateEmployeeDto
    {
        public string Name { get; init; } = string.Empty;
        public string? PhotoUrl { get; init; }
        public DateTimeOffset HireDate { get; init; } = DateTimeOffset.UtcNow;
        public decimal? CommissionPercentage { get; init; }
        public List<Guid> SpecialtyIds { get; init; } = new();
    }

    public record UpdateEmployeeDto
    {
        public string Name { get; init; } = string.Empty;
        public string? PhotoUrl { get; init; }
        public DateTimeOffset HireDate { get; init; }
        public DateTimeOffset? TerminationDate { get; init; }
        public bool IsActive { get; init; }
        public decimal? CommissionPercentage { get; init; }
        public List<Guid> SpecialtyIds { get; init; } = new();
    }

    public record CreateEmployeeAccessDto
    {
        public string Email { get; init; } = string.Empty;
        public string Password { get; init; } = string.Empty;
    }
}
