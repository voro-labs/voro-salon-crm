namespace VoroSwipeEntertainment.Application.DTOs
{
    public class UserKeywordScoreDto
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtensionDto? User { get; set; }

        public Guid KeywordId { get; set; }
        public string? KeywordName { get; set; }
        public KeywordDto? Keyword { get; set; }

        public double Score { get; set; }
    }
}