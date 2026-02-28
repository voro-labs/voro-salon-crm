using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Services.Identity
{
    public class UserRoleService(IUserRoleRepository userRoleRepository) : ServiceBase<UserRole>(userRoleRepository), IUserRoleService
    {
        
    }
}
