using VoroSwipeEntertainment.Domain.Interfaces.Repositories.Identity;
using VoroSwipeEntertainment.Domain.Entities.Identity;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces.Identity;

namespace VoroSwipeEntertainment.Application.Services.Identity
{
    public class UserRoleService(IUserRoleRepository userRoleRepository) : ServiceBase<UserRole>(userRoleRepository), IUserRoleService
    {
        
    }
}
