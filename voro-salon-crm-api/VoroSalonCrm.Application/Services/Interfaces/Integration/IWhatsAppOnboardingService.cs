using VoroSalonCrm.Application.DTOs.Integration;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration;

public interface IWhatsAppOnboardingService
{
    Task ExchangeCodeAsync(WhatsAppExchangeCodeDto dto, Guid tenantId);
    Task DisconnectAsync(Guid tenantId);
    Task<WhatsAppOnboardingStatusDto> GetStatusAsync(Guid tenantId);
    WhatsAppOnboardingConfigDto GetConfig();
}
