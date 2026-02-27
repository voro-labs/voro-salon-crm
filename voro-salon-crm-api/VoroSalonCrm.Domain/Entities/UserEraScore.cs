using VoroSwipeEntertainment.Domain.Interfaces.Entities;
using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class UserEraScore : ISoftDeletable
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtension? User { get; set; }

        public EraEnum Era { get; set; }

        public double Score { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}