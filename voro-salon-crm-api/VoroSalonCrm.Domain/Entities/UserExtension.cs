using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Domain.Entities
{
    public class UserExtension
    {
        [Key]
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
