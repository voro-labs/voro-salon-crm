using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Domain.Entities
{
    public class UserExtension
    {
        [Key]
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        // Refresh token
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }

        // Two-factor authentication (6-digit code)
        public string? TwoFactorCode { get; set; }
        public DateTime? TwoFactorCodeExpiry { get; set; }
        public string? TwoFactorPendingToken { get; set; }

        // Password policy
        public DateTime? PasswordChangedAt { get; set; }
    }
}
