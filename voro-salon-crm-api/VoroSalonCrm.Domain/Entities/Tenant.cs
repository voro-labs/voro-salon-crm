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

        // White-label details
        public string? LogoUrl { get; set; }
        public string PrimaryColor { get; set; } = "#0f172a";
        public string SecondaryColor { get; set; } = "#6366f1";
        public string? ContactPhone { get; set; }
        public string? ContactEmail { get; set; }
        public string ThemeMode { get; set; } = "system";

        public bool IsActive { get; set; } = true;
        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }

        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }

        public ICollection<UserTenant> UserTenants { get; set; } = [];
    }
}
