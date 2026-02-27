using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Application.DTOs
{
    public class UserMediaListDto
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtensionDto User { get; set; } = null!;

        public Guid MediaItemId { get; set; }
        public MediaItemDto MediaItem { get; set; } = null!;

        public UserMediaStatusEnum Status { get; set; }

        public DateTimeOffset AddedAt { get; set; } = DateTime.UtcNow;
    }
}