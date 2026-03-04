using VoroSalonCrm.Application.DTOs.Tenant;

namespace VoroSalonCrm.Application.DTOs.Auth
{
    public record SessionUserDto(
        Guid Id,
        string Name,
        string Email,
        string Role
    );

    public record SessionDto(
        SessionUserDto User,
        TenantDto Tenant
    );
}
