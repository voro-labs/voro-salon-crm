using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.Auth
{
    public class ChangePasswordDto
    {
        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
