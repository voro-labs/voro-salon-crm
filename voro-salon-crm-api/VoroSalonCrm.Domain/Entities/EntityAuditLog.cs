using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Domain.Entities
{
    public class EntityAuditLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(150)]
        public string EntityName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty;

        public string? OldValues { get; set; }
        
        public string? NewValues { get; set; }
        
        [MaxLength(200)]
        public string? PrimaryKey { get; set; }
        
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        public Guid? UserId { get; set; }
        
        public Guid? TenantId { get; set; }
    }
}
