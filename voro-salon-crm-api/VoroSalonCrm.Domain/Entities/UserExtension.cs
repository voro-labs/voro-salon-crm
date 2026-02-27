using System.ComponentModel.DataAnnotations;
using VoroSwipeEntertainment.Domain.Entities.Identity;
using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class UserExtension
    {
        [Key]
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public bool HasCompletedOnboarding { get; set; }
        public ContentTypeEnum ContentType { get; set; }

        public ICollection<UserGenreScore> GenreScores { get; set; } = [];
        public ICollection<UserKeywordScore> KeywordScores { get; set; } = [];
        public ICollection<UserEraScore> EraScores { get; set; } = [];
    }
}
