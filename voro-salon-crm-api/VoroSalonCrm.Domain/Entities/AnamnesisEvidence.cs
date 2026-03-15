namespace VoroSalonCrm.Domain.Entities
{
    public class AnamnesisEvidence
    {
        public Guid Id { get; set; }
        
        public Guid SheetId { get; set; }
        public AnamnesisSheet Sheet { get; set; } = null!;

        public string Url { get; set; } = string.Empty;
        public string? Type { get; set; } // e.g., Photo, Micrograph
        public string? Description { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
