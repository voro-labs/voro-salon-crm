namespace VoroSwipeEntertainment.Domain.Interfaces.Entities
{
    public interface ISoftDeletable
    {
        bool IsDeleted { get; set; }
        DateTimeOffset? DeletedAt { get; set; }
    }
}
