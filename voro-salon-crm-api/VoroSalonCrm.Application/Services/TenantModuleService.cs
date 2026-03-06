using VoroSalonCrm.Application.DTOs.Tenant;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class TenantModuleService(
        ITenantModuleRepository repository,
        ICurrentUserService currentUser,
        IUnitOfWork unitOfWork) : ITenantModuleService
    {
        private readonly ITenantModuleRepository _repository = repository;
        private readonly ICurrentUserService _currentUser = currentUser;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;

        public async Task<IEnumerable<TenantModuleDto>> GetMyModulesAsync()
        {
            var modules = await _repository.GetModulesByTenantIdAsync(_currentUser.TenantId);

            // Ensure all enums are represented (even if not in DB yet)
            var allModules = Enum.GetValues<AppModule>();
            var result = new List<TenantModuleDto>();

            foreach (var mod in allModules)
            {
                var existing = modules.FirstOrDefault(m => m.Module == mod);
                result.Add(new TenantModuleDto
                {
                    Module = mod,
                    IsEnabled = existing?.IsEnabled ?? true, // Default to enabled
                    Configuration = existing?.ConfigurationJson
                });
            }

            return result;
        }

        public async Task UpdateModuleAsync(AppModule module, UpdateTenantModuleDto dto)
        {
            var existing = await _repository.GetModuleAsync(_currentUser.TenantId, module);

            if (existing == null)
            {
                existing = new TenantModule()
                {
                    TenantId = _currentUser.TenantId,
                    Module = module,
                    IsEnabled = dto.IsEnabled,
                    ConfigurationJson = dto.Configuration
                };
                await _repository.AddAsync(existing);
            }
            else
            {
                existing.IsEnabled = dto.IsEnabled;
                existing.ConfigurationJson = dto.Configuration;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                _repository.Update(existing);
            }

            await _unitOfWork.SaveChangesAsync();
        }

        public async Task<bool> IsModuleEnabledAsync(Guid tenantId, AppModule module)
        {
            var existing = await _repository.GetModuleAsync(tenantId, module);
            return existing?.IsEnabled ?? true; // Default to enabled
        }
    }
}
