using AutoMapper;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Mappings
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