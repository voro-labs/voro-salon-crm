using VoroSwipeEntertainment.Domain.Interfaces.Entities;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class MediaKeyword : ISoftDeletable
    {
        public Guid MediaItemId { get; set; }
        public MediaItem MediaItem { get; set; } = null!;

        public Guid KeywordId { get; set; }
        public Keyword Keyword { get; set; } = null!;

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}