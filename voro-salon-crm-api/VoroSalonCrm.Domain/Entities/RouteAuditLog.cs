using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VoroSalonCrm.Domain.Entities
{
    public class RouteAuditLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(20)]
        public string Method { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string Path { get; set; } = string.Empty;

        public string? QueryString { get; set; }
        
        public int StatusCode { get; set; }
        
        [MaxLength(100)]
        public string? IPAddress { get; set; }
        
        public long DurationMs { get; set; }
        
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        public Guid? UserId { get; set; }
        
        public Guid? TenantId { get; set; }
    }
}
