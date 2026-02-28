using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Services.Identity
{
    public class RoleService(IRoleRepository roleRepository) : ServiceBase<Role>(roleRepository), IRoleService
    {
        public async Task<Role?> GetByNameAsync(string roleName)
            => await roleRepository.Query(r => r.Name == roleName).FirstOrDefaultAsync();
    }
}
