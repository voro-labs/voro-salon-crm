namespace VoroSalonCrm.Application.DTOs.Identity
{
    public class RoleDto
    {
        public RoleDto()
        {
            
        }
        
        public RoleDto(Guid id, string name)
        {
            Id = id;
            Name = name;
        }

        public Guid? Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }

        public ICollection<UserRoleDto>? UserRoles { get; set; }
    }
}
