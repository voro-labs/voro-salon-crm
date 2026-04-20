namespace VoroSalonCrm.Application.DTOs.Public
{
    public record PublicBusinessHourRangeDto(string OpenTime, string CloseTime);

    public record PublicBusinessHourDto(
        int DayOfWeek,
        bool IsOpen,
        List<PublicBusinessHourRangeDto> Ranges
    );

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
    )
    {
        public List<PublicBusinessHourDto>? BusinessHours { get; init; }
    };

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

        /// <summary>Legado: ID único de serviço. Mantido para compatibilidade com clientes antigos.</summary>
        public Guid? ServiceId { get; init; }

        /// <summary>Múltiplos serviços. Tem precedência sobre ServiceId quando informado.</summary>
        public List<Guid>? ServiceIds { get; init; }

        public Guid? EmployeeId { get; init; }
        public DateTimeOffset ScheduledDateTime { get; init; }
        public int? ReminderMinutes { get; init; }
        public VoroSalonCrm.Domain.Enums.AppointmentSource Source { get; init; } = VoroSalonCrm.Domain.Enums.AppointmentSource.Website;

        /// <summary>Retorna a lista efetiva de service IDs, unindo ServiceIds e ServiceId legado.</summary>
        public List<Guid> ResolvedServiceIds()
        {
            if (ServiceIds != null && ServiceIds.Count > 0)
                return ServiceIds;
            if (ServiceId.HasValue && ServiceId.Value != Guid.Empty)
                return [ServiceId.Value];
            return [];
        }
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
        bool CanRate = false,
        IEnumerable<string>? ServiceNames = null
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
