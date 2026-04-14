namespace VoroSalonCrm.Application.DTOs.Integration;

public record WhatsAppExchangeCodeDto(string Code, string WabaId);

public record WhatsAppOnboardingStatusDto(
    bool Connected,
    string? DisplayPhone,
    string? BusinessAccountId,
    DateTimeOffset? TokenExpiresAt
);

public record WhatsAppOnboardingConfigDto(string AppId, string ConfigId);
