using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Application.DTOs
{
    public class MediaItemDto
    {
        public Guid Id { get; set; }

        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public int Year { get; set; }

        public ContentTypeEnum Type { get; set; }

        public string Description { get; set; } = string.Empty;
        public string CoverUrl { get; set; } = string.Empty;

        public EraEnum Era { get; set; }

        public ICollection<MediaGenreDto> Genres { get; set; } = [];
        public ICollection<MediaKeywordDto> Keywords { get; set; } = [];

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }

}
