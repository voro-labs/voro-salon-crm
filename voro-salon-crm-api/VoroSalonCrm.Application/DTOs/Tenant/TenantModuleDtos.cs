using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Tenant
{
    public record TenantModuleDto
    {
        public AppModule Module { get; init; }
        public bool IsEnabled { get; init; }
        public string? Configuration { get; init; }
    }

    public record UpdateTenantModuleDto
    {
        public bool IsEnabled { get; init; }
        public string? Configuration { get; init; }
    }
}
