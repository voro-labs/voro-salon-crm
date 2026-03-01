using AutoMapper;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Mappings
{
    public class ReadMappingProfile : Profile
    {
        public ReadMappingProfile()
        {
            CreateMap<UserExtension, UserExtensionDto>();
        }
    }
}