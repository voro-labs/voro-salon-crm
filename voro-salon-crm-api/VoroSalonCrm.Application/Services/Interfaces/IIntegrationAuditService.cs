using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IIntegrationAuditService
    {
        Task LogAsync(string integrationName, string endpoint, string? requestPayload, string? responsePayload, int statusCode, Guid? tenantId);
    }
}
