using AutoMapper;
using Microsoft.EntityFrameworkCore;
using VoroSwipeEntertainment.Application.DTOs;
using VoroSwipeEntertainment.Application.Services.Base;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Domain.Entities;
using System.Collections.Concurrent;
using VoroSwipeEntertainment.Domain.Enums;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;
using VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork;

namespace VoroSwipeEntertainment.Application.Services
{
    public class UserExtensionService(
        IUserExtensionRepository userExtensionRepository,
        IUserMediaInteractionRepository interactionRepository,
        IMediaItemRepository mediaItemRepository,
        IGenreRepository genreRepository,
        IKeywordRepository keywordRepository,
        IUserGenreScoreRepository genreScoreRepository,
        IUserKeywordScoreRepository keywordScoreRepository,
        IUserEraScoreRepository eraScoreRepository,
        IUnitOfWork unitOfWork, IMapper mapper) : ServiceBase<UserExtension>(userExtensionRepository), IUserExtensionService
    {
        private static readonly ConcurrentDictionary<Guid, SemaphoreSlim> _userLocks = new();

        public async Task<UserDataResponseDto> GetUserDataAsync(Guid userId)
        {
            var extension = await userExtensionRepository.Query()
                .Include(x => x.GenreScores)
                    .ThenInclude(x => x.Genre)
                .Include(x => x.KeywordScores)
                    .ThenInclude(x => x.Keyword)
                .Include(x => x.EraScores)
                    .ThenInclude(x => x.Era)
                .FirstOrDefaultAsync(x => x.UserId == userId);

            var interactions = await interactionRepository
                .Include(x => x.MediaItem)
                .Where(x => x.UserId == userId)
                .ToListAsync();

            var liked = interactions.Where(x => x.Action == SwipeActionEnum.Like).Select(x => x.MediaItem);
            var disliked = interactions.Where(x => x.Action == SwipeActionEnum.Dislike).Select(x => x.MediaItem);
            var superLiked = interactions.Where(x => x.Action == SwipeActionEnum.SuperLike).Select(x => x.MediaItem);
            var history = interactions.OrderByDescending(x => x.Timestamp);

            return new UserDataResponseDto
            {
                Profile = mapper.Map<UserExtensionDto>(extension),
                Liked = mapper.Map<IEnumerable<MediaItemDto>>(liked),
                Disliked = mapper.Map<IEnumerable<MediaItemDto>>(disliked),
                SuperLiked = mapper.Map<IEnumerable<MediaItemDto>>(superLiked),
                History = mapper.Map<IEnumerable<UserMediaInteractionDto>>(history),
                HasCompletedOnboarding = extension?.HasCompletedOnboarding ?? false
            };
        }

        public async Task SyncAsync(Guid userId, UserSyncDto dto)
        {
            var userLock = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
            await userLock.WaitAsync();

            int maxRetries = 3;
            int delayBetweenRetries = 100;

            try
            {
                for (int attempt = 1; attempt <= maxRetries; attempt++)
                {
                    try
                    {
                        await PerformSyncInternalAsync(userId, dto);
                        return; // Success
                    }
                    catch (DbUpdateConcurrencyException) when (attempt < maxRetries)
                    {
                        Console.WriteLine($"Concurrency conflict detected on attempt {attempt} for user {userId}. Retrying...");
                        await unitOfWork.RollbackAsync();
                        unitOfWork.ClearTracker();
                        await Task.Delay(delayBetweenRetries * attempt);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error during SyncAsync attempt {attempt}: {ex.Message}");
                        await unitOfWork.RollbackAsync();
                        unitOfWork.ClearTracker();
                        if (attempt >= maxRetries) throw;
                        await Task.Delay(delayBetweenRetries * attempt);
                    }
                }
            }
            finally
            {
                userLock.Release();
            }
        }

        private async Task PerformSyncInternalAsync(Guid userId, UserSyncDto dto)
        {
            await unitOfWork.BeginTransactionAsync();

            try
            {
                // Local cache to avoid duplicate additions/fetches in the same request
                var resolvedMediaItems = new Dictionary<string, MediaItem>();

                // Consolidated interactions to avoid duplicate key errors
                var consolidatedInteractions = new Dictionary<Guid, (SwipeActionEnum Action, DateTimeOffset Timestamp)>();


                // Actually, let's refactor the flow:
                // 1. Resolve all MediaItems involved (Liked, Disliked, SuperLiked, History)
                // 2. Consolidate their actions
                // 3. Update interactionRepository once per MediaItemId

                if (dto.Liked != null)
                {
                    foreach (var item in dto.Liked)
                    {
                        var mediaItem = await GetOrCreateMediaItemAsync(item, resolvedMediaItems);
                        consolidatedInteractions[mediaItem.Id] = (SwipeActionEnum.Like, DateTimeOffset.UtcNow);
                    }
                }

                if (dto.Disliked != null)
                {
                    foreach (var item in dto.Disliked)
                    {
                        var mediaItem = await GetOrCreateMediaItemAsync(item, resolvedMediaItems);
                        consolidatedInteractions[mediaItem.Id] = (SwipeActionEnum.Dislike, DateTimeOffset.UtcNow);
                    }
                }

                if (dto.SuperLiked != null)
                {
                    foreach (var item in dto.SuperLiked)
                    {
                        var mediaItem = await GetOrCreateMediaItemAsync(item, resolvedMediaItems);
                        consolidatedInteractions[mediaItem.Id] = (SwipeActionEnum.SuperLike, DateTimeOffset.UtcNow);
                    }
                }

                if (dto.History != null)
                {
                    foreach (var h in dto.History.OrderBy(x => x.Timestamp))
                    {
                        MediaItem? mediaItem = null;
                        if (h.MediaItem != null && !string.IsNullOrEmpty(h.MediaItem.Slug))
                        {
                            mediaItem = await GetOrCreateMediaItemAsync(h.MediaItem, resolvedMediaItems);
                        }
                        else if (h.MediaItemId != Guid.Empty)
                        {
                            mediaItem = await mediaItemRepository.GetByIdAsync(h.MediaItemId);
                        }

                        if (mediaItem != null)
                        {
                            consolidatedInteractions[mediaItem.Id] = (h.Action, h.Timestamp);
                        }
                    }
                }

                // Bulk fetch EVERYTHING to avoid N+1 and tracking issues
                var existingInteractions = (await interactionRepository
                    .GetAllAsync(x => x.UserId == userId))
                    .ToDictionary(x => x.MediaItemId);

                var existingGenreScores = (await genreScoreRepository
                    .GetAllAsync(x => x.UserId == userId))
                    .ToDictionary(x => x.GenreId);

                var existingKeywordScores = (await keywordScoreRepository
                    .GetAllAsync(x => x.UserId == userId))
                    .ToDictionary(x => x.KeywordId);

                var existingEraScores = (await eraScoreRepository
                    .GetAllAsync(x => x.UserId == userId))
                    .ToDictionary(x => x.Era);

                // 1. Process Interactions
                foreach (var interaction in consolidatedInteractions)
                {
                    existingInteractions.TryGetValue(interaction.Key, out var existing);
                    
                    if (existing == null)
                    {
                        await interactionRepository.AddAsync(new UserMediaInteraction
                        {
                            Id = Guid.NewGuid(),
                            UserId = userId,
                            MediaItemId = interaction.Key,
                            Action = interaction.Value.Action,
                            Timestamp = interaction.Value.Timestamp
                        });
                    }
                    else
                    {
                        bool hasChanged = existing.Action != interaction.Value.Action || 
                                         Math.Abs((existing.Timestamp - interaction.Value.Timestamp).TotalSeconds) > 1;

                        if (hasChanged)
                        {
                            existing.Action = interaction.Value.Action;
                            existing.Timestamp = interaction.Value.Timestamp;
                            interactionRepository.Update(existing);
                        }
                    }
                }

                // 2. Process Extension & Scores
                if (dto.Profile != null || dto.HasCompletedOnboarding.HasValue)
                {
                    var extension = await userExtensionRepository.GetByIdAsync(userId);

                    if (extension != null)
                    {
                        if (dto.HasCompletedOnboarding.HasValue)
                        {
                            extension.HasCompletedOnboarding = dto.HasCompletedOnboarding.Value;
                            userExtensionRepository.Update(extension);
                        }

                        if (dto.Profile != null)
                        {
                            // Sync Genre scores
                            if (dto.Profile.GenreScores != null)
                            {
                                var incomingGenres = dto.Profile.GenreScores
                                    .GroupBy(g => g.GenreName)
                                    .Select(g => g.First())
                                    .ToList();

                                foreach (var gs in incomingGenres)
                                {
                                    var genre = await GetOrCreateGenreAsync(gs.GenreId, gs.GenreName);
                                    if (genre == null) continue;

                                    if (!existingGenreScores.TryGetValue(genre.Id, out var existingScore))
                                    {
                                        await genreScoreRepository.AddAsync(new UserGenreScore
                                        {
                                            Id = Guid.NewGuid(),
                                            UserId = userId,
                                            GenreId = genre.Id,
                                            Score = gs.Score
                                        });
                                    }
                                    else if (Math.Abs(existingScore.Score - gs.Score) > 0.001)
                                    {
                                        existingScore.Score = gs.Score;
                                        genreScoreRepository.Update(existingScore);
                                    }
                                }
                            }

                            // Sync Keyword scores
                            if (dto.Profile.KeywordScores != null)
                            {
                                var incomingKeywords = dto.Profile.KeywordScores
                                    .GroupBy(k => k.KeywordName)
                                    .Select(k => k.First())
                                    .ToList();

                                foreach (var ks in incomingKeywords)
                                {
                                    var keyword = await GetOrCreateKeywordAsync(ks.KeywordId, ks.KeywordName);
                                    if (keyword == null) continue;

                                    if (!existingKeywordScores.TryGetValue(keyword.Id, out var existingScore))
                                    {
                                        await keywordScoreRepository.AddAsync(new UserKeywordScore
                                        {
                                            Id = Guid.NewGuid(),
                                            UserId = userId,
                                            KeywordId = keyword.Id,
                                            Score = ks.Score
                                        });
                                    }
                                    else if (Math.Abs(existingScore.Score - ks.Score) > 0.001)
                                    {
                                        existingScore.Score = ks.Score;
                                        keywordScoreRepository.Update(existingScore);
                                    }
                                }
                            }

                            // Sync Era scores
                            if (dto.Profile.EraScores != null)
                            {
                                var incomingEras = dto.Profile.EraScores
                                    .GroupBy(e => e.Era)
                                    .Select(e => e.First())
                                    .ToList();

                                foreach (var es in incomingEras)
                                {
                                    if (!existingEraScores.TryGetValue(es.Era, out var existingScore))
                                    {
                                        await eraScoreRepository.AddAsync(new UserEraScore
                                        {
                                            Id = Guid.NewGuid(),
                                            UserId = userId,
                                            Era = es.Era,
                                            Score = es.Score
                                        });
                                    }
                                    else if (Math.Abs(existingScore.Score - es.Score) > 0.001)
                                    {
                                        existingScore.Score = es.Score;
                                        eraScoreRepository.Update(existingScore);
                                    }
                                }
                            }
                        }
                    }
                }

                await unitOfWork.CommitAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during PerformSyncInternalAsync: {ex.Message}");
                throw;
            }
        }

        private async Task<Genre?> GetOrCreateGenreAsync(Guid id, string? name)
        {
            if (id != Guid.Empty) return await genreRepository.GetByIdAsync(id);
            if (string.IsNullOrEmpty(name)) return null;

            var existing = await genreRepository.GetByIdAsync(x => x.Name == name);
            if (existing != null) return existing;

            var newGenre = new Genre { Id = Guid.NewGuid(), Name = name };
            await genreRepository.AddAsync(newGenre);
            return newGenre;
        }

        private async Task<Keyword?> GetOrCreateKeywordAsync(Guid id, string? name)
        {
            if (id != Guid.Empty) return await keywordRepository.GetByIdAsync(id);
            if (string.IsNullOrEmpty(name)) return null;

            var existing = await keywordRepository.GetByIdAsync(x => x.Name == name);
            if (existing != null) return existing;

            var newKeyword = new Keyword { Id = Guid.NewGuid(), Name = name };
            await keywordRepository.AddAsync(newKeyword);
            return newKeyword;
        }

        private async Task<MediaItem> GetOrCreateMediaItemAsync(
            MediaItemDto dto, 
            Dictionary<string, MediaItem> cache)
        {
            if (cache.TryGetValue(dto.Slug, out var cached))
                return cached;

            var mediaItem = await mediaItemRepository.GetByIdAsync(x => x.Slug == dto.Slug);

            if (mediaItem == null)
            {
                mediaItem = new MediaItem
                {
                    Id = Guid.NewGuid(),
                    Slug = dto.Slug,
                    Title = dto.Title,
                    CoverUrl = dto.CoverUrl,
                    Type = dto.Type,
                    Year = dto.Year,
                    Era = dto.Era,
                    Description = dto.Description
                };
                await mediaItemRepository.AddAsync(mediaItem);
            }

            cache[dto.Slug] = mediaItem;
            return mediaItem;
        }


        public async Task<UserExtensionDto> CreateAsync(UserExtensionDto dto)
        {
            var createUserExtensionDto = mapper.Map<UserExtension>(dto);

            await base.AddAsync(createUserExtensionDto);

            return mapper.Map<UserExtensionDto>(createUserExtensionDto);
        }

        public Task DeleteAsync(Guid id)
        {
            return base.DeleteAsync(id);
        }

        public async Task<IEnumerable<UserExtensionDto>> GetAllAsync()
        {
            var userExtensions = await base.Query()
                .ToListAsync();

            return mapper.Map<IEnumerable<UserExtensionDto>>(userExtensions);
        }

        public async Task<UserExtensionDto?> GetByIdAsync(Guid id)
        {
            var userExtension = await base.Query()
                .Where(s => s.UserId == id)
                .FirstOrDefaultAsync();

            return mapper.Map<UserExtensionDto?>(userExtension);
        }

        public async Task<UserExtensionDto> UpdateAsync(Guid id, UserExtensionDto dto)
        {
            var existingUserExtension = await base.GetByIdAsync(id)
                ?? throw new KeyNotFoundException("UserExtension não encontrado");

            mapper.Map(dto, existingUserExtension);

            base.Update(existingUserExtension);

            return mapper.Map<UserExtensionDto>(existingUserExtension);
        }
    }
}