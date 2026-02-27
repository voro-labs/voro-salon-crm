namespace VoroSwipeEntertainment.Application.DTOs
{
    public class MediaKeywordDto
    {
        public Guid MediaItemId { get; set; }
        public MediaItemDto? MediaItem { get; set; }

        public Guid KeywordId { get; set; }
        public KeywordDto? Keyword { get; set; }
    }
}
