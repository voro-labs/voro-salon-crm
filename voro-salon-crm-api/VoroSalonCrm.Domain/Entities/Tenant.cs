using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class Tenant : ISoftDeletable
    {
        public Guid Id { get; set; }

        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [StringLength(100)]
        public string Slug { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
