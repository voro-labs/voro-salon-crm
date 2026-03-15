namespace VoroSalonCrm.Domain.Entities
{
    public class AnamnesisResponse
    {
        public Guid Id { get; set; }
        
        public Guid SheetId { get; set; }
        public AnamnesisSheet Sheet { get; set; } = null!;

        public Guid QuestionId { get; set; }
        public AnamnesisQuestion Question { get; set; } = null!;

        public string Value { get; set; } = string.Empty;
    }
}
