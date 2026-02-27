using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace VoroSwipeEntertainment.Domain.Entities.Identity
{
    public class UserRole : IdentityUserRole<Guid>
    {
        public UserRole(Guid userId, Guid roleId)
        {
            this.UserId = userId;
            this.RoleId = roleId;
        }

        public UserRole()
        {
        }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [ForeignKey("RoleId")]
        public Role? Role { get; set; }
    }
}
