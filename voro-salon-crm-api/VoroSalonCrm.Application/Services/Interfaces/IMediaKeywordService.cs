using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IMediaKeywordService : IServiceBase<MediaKeyword>
    {
        Task<IEnumerable<MediaKeywordDto>> GetAllAsync();
        Task<MediaKeywordDto?> GetByIdAsync(Guid keywordId, Guid mediaItemId);
        Task<MediaKeywordDto> CreateAsync(MediaKeywordDto model);
        Task<MediaKeywordDto> UpdateAsync(Guid keywordId, Guid mediaItemId, MediaKeywordDto model);
        Task DeleteAsync(Guid keywordId, Guid mediaItemId);
    }

}
