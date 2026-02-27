using VoroSwipeEntertainment.Domain.Interfaces.Entities;

namespace VoroSwipeEntertainment.Domain.Entities
{
    public class Genre : ISoftDeletable
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;

        public ICollection<MediaGenre> MediaGenres { get; set; } = [];

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
