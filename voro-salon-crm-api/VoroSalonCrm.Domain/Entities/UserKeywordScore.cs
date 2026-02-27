using VoroSwipeEntertainment.Domain.Interfaces.Entities;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class UserKeywordScore : ISoftDeletable
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtension User { get; set; } = null!;

        public Guid KeywordId { get; set; }
        public Keyword Keyword { get; set; } = null!;

        public double Score { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}