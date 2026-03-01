using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs
{
    public class UserExtensionDto
    {
        public Guid? UserId { get; set; }
        public UserDto? User { get; set; }
    }
}
