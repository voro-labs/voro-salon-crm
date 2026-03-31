namespace VoroSalonCrm.Application.DTOs.Public
{
    public record PublicTenantDto(
        Guid Id,
        string Name,
        string Slug,
        string? ContactPhone,
        string? LogoUrl,
        string? PrimaryColor,
        string? SecondaryColor,
        string? ThemeMode,
        bool IsBookingEnabled
    );

    public record PublicServiceDto(
        Guid Id,
        string Name,
        decimal Price,
        int DurationMinutes
    );

    public record PublicEmployeeDto(
        Guid Id,
        string Name,
        string? PhotoUrl
    );

    public record PublicClientDto(
        Guid Id,
        string Name,
        string Phone
    );

    public record PublicBookingCreateDto
    {
        public string TenantSlug { get; init; } = string.Empty;
        public string ClientName { get; init; } = string.Empty;
        public string ClientPhone { get; init; } = string.Empty;
        public string? Description { get; init; }
        public string? Notes { get; init; }
        public Guid ServiceId { get; init; }
        public Guid? EmployeeId { get; init; }
        public DateTimeOffset ScheduledDateTime { get; init; }
        public int? ReminderMinutes { get; init; }
    }

    public record PublicReceiptDto(
        Guid Id,
        string ClientName,
        string ServiceName,
        string? EmployeeName,
        DateTimeOffset ScheduledDateTime,
        int DurationMinutes,
        decimal Amount,
        string Status,
        PublicTenantDto Tenant,
        IEnumerable<CRM.AvailabilitySlotDto> DayAgenda
    );
}
