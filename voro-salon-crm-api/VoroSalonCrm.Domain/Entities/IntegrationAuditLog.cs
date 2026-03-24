using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VoroSalonCrm.Domain.Entities
{
    public class IntegrationAuditLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(150)]
        public string IntegrationName { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Endpoint { get; set; } = string.Empty;

        public string? RequestPayload { get; set; }
        
        public string? ResponsePayload { get; set; }
        
        public int StatusCode { get; set; }
        
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        public Guid? TenantId { get; set; }
        public Tenant Tenant { get; set; } = null!;
    }
}
