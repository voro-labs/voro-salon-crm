namespace VoroSalonCrm.Application.DTOs.Identity
{
    public class UserDto
    {
        public Guid? Id { get; set; }
        public string? UserName { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Email { get; set; }
        public string? AvatarUrl { get; set; }
        public string? CountryCode { get; set; }
        public string? PhoneNumber { get; set; }
        public bool? IsActive { get; set; }
        
        public DateTimeOffset? BirthDate { get; set; }

        public UserExtensionDto? UserExtension { get; set; }
        public ICollection<UserRoleDto>? UserRoles { get; set; }
    }
}
