using VoroSalonCrm.Application.DTOs.Public;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IPublicBookingService
    {
        Task<PublicTenantDto?> GetTenantBySlugAsync(string slug);
        Task<PublicClientDto?> CheckClientByPhoneAsync(string tenantSlug, string phone);
        Task<IEnumerable<PublicServiceDto>> GetServicesByTenantAsync(string tenantSlug);
        Task<IEnumerable<PublicEmployeeDto>> GetEmployeesByServiceAsync(string tenantSlug, Guid serviceId);
        Task<PublicBookingResponseDto> CreateBookingAsync(PublicBookingCreateDto dto);
        Task<IEnumerable<VoroSalonCrm.Application.DTOs.CRM.AvailabilitySlotDto>> GetAvailableSlotsAsync(string tenantSlug, DateTime date, Guid? employeeId = null);
    }

    public record PublicBookingResponseDto(bool Success, string Message, Guid? AppointmentId);
}
