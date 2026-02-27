
using VoroSwipeEntertainment.Domain.Enums;
using VoroSwipeEntertainment.Domain.Interfaces.Entities;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class MediaItem : ISoftDeletable
    {
        public Guid Id { get; set; }
        public string Slug { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;
        public int Year { get; set; }

        public ContentTypeEnum Type { get; set; }

        public string Description { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;

        public EraEnum Era { get; set; }

        public ICollection<MediaGenre> Genres { get; set; } = [];
        public ICollection<MediaKeyword> Keywords { get; set; } = [];

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }

}
