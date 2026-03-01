using AutoMapper;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Mappings
{
    public class WriteMappingProfile : Profile
    {
        public WriteMappingProfile()
        {
            CreateMap<UserExtensionDto, UserExtension>()
                .ForMember(d => d.UserId, o => o.Ignore());
        }
    }
}