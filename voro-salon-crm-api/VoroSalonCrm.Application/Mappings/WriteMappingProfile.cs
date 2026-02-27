using AutoMapper;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Mappings
{
    public class WriteMappingProfile : Profile
    {
        public WriteMappingProfile()
        {
            CreateMap<UserExtensionDto, UserExtension>()
                .ForMember(d => d.UserId, o => o.Ignore());

            CreateMap<MediaItemDto, MediaItem>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<GenreDto, Genre>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<KeywordDto, Keyword>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<MediaGenreDto, MediaGenre>()
              .ForMember(d => d.GenreId, o => o.Ignore())
              .ForMember(d => d.MediaItemId, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<MediaKeywordDto, MediaKeyword>()
              .ForMember(d => d.KeywordId, o => o.Ignore())
              .ForMember(d => d.MediaItemId, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<UserMediaInteractionDto, UserMediaInteraction>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.Timestamp, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<UserMediaListDto, UserMediaList>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.AddedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<UserGenreScoreDto, UserGenreScore>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<UserKeywordScoreDto, UserKeywordScore>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());

            CreateMap<UserEraScoreDto, UserEraScore>()
              .ForMember(d => d.Id, o => o.Ignore())
              .ForMember(d => d.CreatedAt, o => o.Ignore())
              .ForMember(d => d.IsDeleted, o => o.Ignore())
              .ForMember(d => d.DeletedAt, o => o.Ignore());
        }
    }
}