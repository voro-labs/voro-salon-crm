using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities.Identity
{
    public class User : IdentityUser<Guid>, ISoftDeletable
    {
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [StringLength(3)]
        public string? CountryCode { get; set; }

        public string? AvatarUrl { get; set; }

        public DateTimeOffset? BirthDate { get; set; }

        public DateTimeOffset CreatedAt { get; set; } = DateTime.UtcNow;

        public UserExtension? UserExtension { get; set; }
        public ICollection<UserRole> UserRoles { get; set; } = [];

        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; }
        public DateTimeOffset? DeletedAt { get; set; }
    }
}
