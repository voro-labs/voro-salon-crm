namespace VoroSwipeEntertainment.Application.DTOs
{
    public class UserGenreScoreDto
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtensionDto? User { get; set; }

        public Guid GenreId { get; set; }
        public string? GenreName { get; set; }
        public GenreDto? Genre { get; set; }

        public double Score { get; set; }
    }
}