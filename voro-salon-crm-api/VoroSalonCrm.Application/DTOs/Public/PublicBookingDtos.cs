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
        int DurationMinutes,
        decimal? PromotionalPrice = null,
        bool HasPromotion = false
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
        public VoroSalonCrm.Domain.Enums.AppointmentSource Source { get; init; } = VoroSalonCrm.Domain.Enums.AppointmentSource.Website;
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
        IEnumerable<CRM.AvailabilitySlotDto> DayAgenda,
        int? Rating = null,
        bool CanRate = false
    );

    public record PublicBookingTrackDto(
        string TenantSlug,
        string SessionId,
        string FunnelState,
        string? ContactName = null,
        string? PhoneNumber = null,
        Guid? AppointmentId = null
    );

    public record FunnelSessionDto(
        Guid Id,
        string SessionId,
        string FunnelState,
        int Source,
        string? ContactName,
        string? PhoneNumber,
        Guid? AppointmentId,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt
    );

    public record FunnelItemDto(
        Guid Id,
        string ClientName,
        string? ClientPhone,
        string? ServiceName,
        string? ScheduledDateTime,
        int? DurationMinutes,
        int? Status,
        decimal? Amount,
        int Source,
        string? EmployeeName,
        string FunnelState,
        string? SessionId
    );
}
