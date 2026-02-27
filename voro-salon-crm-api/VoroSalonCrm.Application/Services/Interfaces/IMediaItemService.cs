using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;
using VoroSwipeEntertainment.Domain.Entities;

namespace VoroSwipeEntertainment.Application.Services.Interfaces
{
    public interface IMediaItemService : IServiceBase<MediaItem>
    {
        Task<IEnumerable<MediaItemDto>> GetAllAsync();
        Task<MediaItemDto?> GetByIdAsync(Guid id);
        Task<MediaItemDto> CreateAsync(MediaItemDto model);
        Task<MediaItemDto> UpdateAsync(Guid id, MediaItemDto model);
        Task DeleteAsync(Guid id);
    }

}
