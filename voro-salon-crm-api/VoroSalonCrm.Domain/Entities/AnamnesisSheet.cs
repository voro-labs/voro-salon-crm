using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class AnamnesisSheet : ISoftDeletable, ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;

        public Guid ClientId { get; set; }
        public Client Client { get; set; } = null!;

        public Guid ProfessionalId { get; set; }
        // public User Professional { get; set; } = null!; // Assuming a User/Professional entity exists

        public DateTimeOffset Date { get; set; }
        public string? Diagnosis { get; set; }
        public string? TreatmentProtocol { get; set; }
        public AnamnesisSheetStatus Status { get; set; }

        public ICollection<AnamnesisResponse> Responses { get; set; } = new List<AnamnesisResponse>();
        public ICollection<AnamnesisEvidence> Evidences { get; set; } = new List<AnamnesisEvidence>();
        public ICollection<AnamnesisSignature> Signatures { get; set; } = new List<AnamnesisSignature>();

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
