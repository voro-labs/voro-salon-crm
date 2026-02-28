namespace VoroSalonCrm.Application.DTOs.Identity
{
    public class UserRoleDto
    {
        public Guid? UserId { get; set; }
        public Guid? RoleId { get; set; }

        public string? RoleName { get; set; }
        public string? UserName { get; set; }

        public RoleDto? Role { get; set; }
        public UserDto? User { get; set; }
    }
}
