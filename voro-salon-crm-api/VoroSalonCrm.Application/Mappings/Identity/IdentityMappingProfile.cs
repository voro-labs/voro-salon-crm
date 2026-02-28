using AutoMapper;
using VoroSalonCrm.Application.DTOs.Identity;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Application.Mappings.Identity
{
    public class IdentityMappingProfile : Profile
    {
        public IdentityMappingProfile()
        {
            // =========================
            // USER
            // =========================
            CreateMap<User, UserDto>();

            CreateMap<UserDto, User>()
                .ForMember(d => d.Id, o => o.Ignore())
                .ForMember(d => d.PasswordHash, o => o.Ignore())
                .ForMember(d => d.ConcurrencyStamp, o => o.Ignore())
                .ForMember(d => d.DeletedAt, o => o.Ignore())
                .ForMember(d => d.CreatedAt, o => o.Ignore())
                .ForMember(d => d.EmailConfirmed, o => o.Ignore())
                .ForMember(d => d.UserRoles, o => o.Ignore())
                .ForMember(d => d.TwoFactorEnabled, o => o.Ignore())
                .ForMember(d => d.SecurityStamp, o => o.Ignore())
                .ForMember(d => d.PhoneNumberConfirmed, o => o.Ignore())
                .ForMember(d => d.NormalizedEmail, o => o.Ignore())
                .ForMember(d => d.NormalizedUserName, o => o.Ignore())
                .ForMember(d => d.LockoutEnd, o => o.Ignore())
                .ForMember(d => d.LockoutEnabled, o => o.Ignore())
                .ForMember(d => d.IsDeleted, o => o.Ignore())
                .ForMember(d => d.IsActive, o => o.Ignore())
                .ForMember(d => d.AccessFailedCount, o => o.Ignore())
                .ForAllMembers(o =>
                    o.Condition((src, dest, srcMember) => srcMember != null));

            // =========================
            // ROLE
            // =========================
            CreateMap<Role, RoleDto>();

            CreateMap<RoleDto, Role>()
                .ForMember(d => d.Id, o => o.Ignore())
                .ForAllMembers(o =>
                    o.Condition((src, dest, srcMember) => srcMember != null));

            // =========================
            // USER ROLE
            // =========================
            CreateMap<UserRole, UserRoleDto>();

            CreateMap<UserRoleDto, UserRole>()
                .ForMember(d => d.UserId, o => o.Ignore())
                .ForMember(d => d.RoleId, o => o.Ignore())
                .ForAllMembers(o =>
                    o.Condition((src, dest, srcMember) => srcMember != null));
        }
    }
}
