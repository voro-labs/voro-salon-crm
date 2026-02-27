using VoroSwipeEntertainment.Domain.Interfaces.Entities;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class MediaGenre : ISoftDeletable
    {
        public Guid MediaItemId { get; set; }
        public MediaItem MediaItem { get; set; } = null!;

        public Guid GenreId { get; set; }
        public Genre Genre { get; set; } = null!;

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}