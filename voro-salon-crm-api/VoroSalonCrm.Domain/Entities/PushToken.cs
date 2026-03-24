using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Domain.Entities
{
    public class PushToken
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        public string Token { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty; // "ios", "android", "web"
        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
