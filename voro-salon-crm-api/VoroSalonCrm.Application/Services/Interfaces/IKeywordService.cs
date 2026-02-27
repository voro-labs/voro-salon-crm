using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IKeywordService : IServiceBase<Keyword>
    {
        Task<IEnumerable<KeywordDto>> GetAllAsync();
        Task<KeywordDto?> GetByIdAsync(Guid id);
        Task<KeywordDto> CreateAsync(KeywordDto model);
        Task<KeywordDto> UpdateAsync(Guid id, KeywordDto model);
        Task DeleteAsync(Guid id);
    }

}
