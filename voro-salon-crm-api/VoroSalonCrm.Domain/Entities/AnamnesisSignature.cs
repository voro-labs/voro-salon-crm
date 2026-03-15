using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Domain.Entities
{
    public class AnamnesisSignature
    {
        public Guid Id { get; set; }
        
        public Guid SheetId { get; set; }
        public AnamnesisSheet Sheet { get; set; } = null!;

        public AnamnesisSignatureType Type { get; set; }
        public string SignatureData { get; set; } = string.Empty; // Base64 or URL
        public DateTimeOffset SignedAt { get; set; } = DateTimeOffset.UtcNow;
    }
}
