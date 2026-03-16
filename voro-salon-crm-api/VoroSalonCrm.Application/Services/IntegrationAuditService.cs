using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class IntegrationAuditService(IIntegrationAuditRepository integrationAuditRepository, IUnitOfWork unitOfWork) : IIntegrationAuditService
    {
        private readonly IIntegrationAuditRepository _integrationAuditRepository = integrationAuditRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;

        public async Task LogAsync(string integrationName, string endpoint, string? requestPayload, string? responsePayload, int statusCode, Guid? tenantId)
        {
            var auditLog = new IntegrationAuditLog
            {
                IntegrationName = integrationName,
                Endpoint = endpoint,
                RequestPayload = requestPayload,
                ResponsePayload = responsePayload,
                StatusCode = statusCode,
                Timestamp = DateTime.UtcNow,
                TenantId = tenantId
            };

            await _integrationAuditRepository.AddAsync(auditLog);
            await _unitOfWork.SaveChangesAsync();
        }
    }
}
