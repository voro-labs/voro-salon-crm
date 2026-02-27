using VoroSwipeEntertainment.Application.DTOs.Identity;
using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Application.DTOs
{
    public class UserExtensionDto
    {
        public Guid? UserId { get; set; }
        public UserDto? User { get; set; }

        public ICollection<UserKeywordScoreDto> KeywordScores { get; set; } = [];
        public ICollection<UserGenreScoreDto> GenreScores { get; set; } = [];
        public ICollection<UserEraScoreDto> EraScores { get; set; } = [];
    }
}
