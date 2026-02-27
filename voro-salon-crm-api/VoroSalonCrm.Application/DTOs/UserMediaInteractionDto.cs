using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Application.DTOs
{
    public class UserMediaInteractionDto
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtensionDto? User { get; set; }

        public Guid MediaItemId { get; set; }
        public MediaItemDto? MediaItem { get; set; }

        public SwipeActionEnum Action { get; set; }

        public DateTimeOffset Timestamp { get; set; } = DateTime.UtcNow;
    }
}