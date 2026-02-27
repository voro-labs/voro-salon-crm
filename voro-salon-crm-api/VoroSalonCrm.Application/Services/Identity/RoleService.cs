using VoroSwipeEntertainment.Domain.Interfaces.Repositories.Identity;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Domain.Entities.Identity;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces.Identity;

namespace VoroSwipeEntertainment.Application.Services.Identity
{
    public class RoleService(IRoleRepository roleRepository) : ServiceBase<Role>(roleRepository), IRoleService
    {
        public async Task<Role?> GetByNameAsync(string roleName)
            => await roleRepository.Query(r => r.Name == roleName).FirstOrDefaultAsync();
    }
}
