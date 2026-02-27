using VoroSwipeEntertainment.Domain.Enums;
using VoroSwipeEntertainment.Domain.Interfaces.Entities;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class UserMediaInteraction : ISoftDeletable
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtension User { get; set; } = null!;

        public Guid MediaItemId { get; set; }
        public MediaItem MediaItem { get; set; } = null!;

        public SwipeActionEnum Action { get; set; }

        public DateTimeOffset Timestamp { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}