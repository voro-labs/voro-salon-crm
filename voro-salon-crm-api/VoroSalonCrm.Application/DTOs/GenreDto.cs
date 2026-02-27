namespace VoroSwipeEntertainment.Application.DTOs
{
    public class GenreDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public ICollection<MediaGenreDto> MediaGenres { get; set; } = [];
    }
}
