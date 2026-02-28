using Microsoft.AspNetCore.Identity;

namespace VoroSalonCrm.Domain.Entities.Identity
{
    public class Role : IdentityRole<Guid>
    {
        public Role(string name)
        {
            this.Name = name;
        }

        public Role()
        {
        }

        public ICollection<UserRole> UserRoles { get; set; } = [];
    }
}
