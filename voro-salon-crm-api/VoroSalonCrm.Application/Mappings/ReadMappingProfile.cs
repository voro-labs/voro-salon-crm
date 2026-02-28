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
            CreateMap<MediaItem, MediaItemDto>();
            CreateMap<Genre, GenreDto>();
            CreateMap<Keyword, KeywordDto>();
            CreateMap<MediaGenre, MediaGenreDto>();
            CreateMap<MediaKeyword, MediaKeywordDto>();
            CreateMap<UserMediaInteraction, UserMediaInteractionDto>();
            CreateMap<UserMediaList, UserMediaListDto>();
            CreateMap<UserGenreScore, UserGenreScoreDto>();
            CreateMap<UserKeywordScore, UserKeywordScoreDto>();
            CreateMap<UserEraScore, UserEraScoreDto>();
        }
    }
}