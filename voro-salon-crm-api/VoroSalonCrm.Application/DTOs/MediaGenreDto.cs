namespace VoroSwipeEntertainment.Application.DTOs
{
    public class MediaGenreDto
    {
        public Guid MediaItemId { get; set; }
        public MediaItemDto? MediaItem { get; set; }

        public Guid GenreId { get; set; }
        public GenreDto? Genre { get; set; }
    }
}