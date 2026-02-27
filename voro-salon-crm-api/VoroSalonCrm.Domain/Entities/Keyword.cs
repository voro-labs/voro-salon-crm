using VoroSwipeEntertainment.Domain.Interfaces.Entities;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class Keyword : ISoftDeletable
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public ICollection<MediaKeyword> MediaKeywords { get; set; } = [];

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}