using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionRulesEngine(
        IEvolutionTemplateRepository repository,
        IMemoryCache cache) : IEvolutionRulesEngine
    {
        private const string CacheKey = "evolution_rules_templates";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

        public async Task<EvolutionTemplate?> MatchAsync(string bodyText, CancellationToken ct = default)
        {
            if (!cache.TryGetValue(CacheKey, out List<EvolutionTemplate>? templates))
            {
                var all = await repository.GetAllAsync(
                    t => t.IsActive && t.Keywords != null);

                templates = all.OrderBy(t => t.CreatedAt).ToList();
                cache.Set(CacheKey, templates, CacheTtl);
            }

            var lower = bodyText.ToLowerInvariant();

            foreach (var template in templates!)
            {
                var keywords = JsonSerializer.Deserialize<string[]>(template.Keywords!) ?? [];
                if (keywords.Any(kw => lower.Contains(kw.ToLowerInvariant())))
                    return template;
            }

            return null;
        }
    }
}
