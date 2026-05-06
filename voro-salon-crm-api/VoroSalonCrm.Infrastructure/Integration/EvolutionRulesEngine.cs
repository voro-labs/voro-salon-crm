using System.Text.Json;
using System.Text.RegularExpressions;
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
        private static readonly Regex WordSplitter = new(@"\s+", RegexOptions.Compiled);

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

            // Exact substring match first
            foreach (var template in templates!)
            {
                var keywords = JsonSerializer.Deserialize<string[]>(template.Keywords!) ?? [];
                if (keywords.Any(kw => lower.Contains(kw.ToLowerInvariant())))
                    return template;
            }

            // Fuzzy word-level match (Levenshtein) for short messages / typos
            var words = WordSplitter.Split(lower.Trim());
            foreach (var template in templates!)
            {
                var keywords = JsonSerializer.Deserialize<string[]>(template.Keywords!) ?? [];
                foreach (var kw in keywords)
                {
                    var kwLower = kw.ToLowerInvariant();
                    int threshold = kwLower.Length <= 4 ? 1 : 2;
                    if (words.Any(w => Levenshtein(w, kwLower) <= threshold))
                        return template;
                }
            }

            return null;
        }

        private static int Levenshtein(string a, string b)
        {
            if (a == b) return 0;
            if (a.Length == 0) return b.Length;
            if (b.Length == 0) return a.Length;

            var d = new int[a.Length + 1, b.Length + 1];
            for (int i = 0; i <= a.Length; i++) d[i, 0] = i;
            for (int j = 0; j <= b.Length; j++) d[0, j] = j;

            for (int i = 1; i <= a.Length; i++)
                for (int j = 1; j <= b.Length; j++)
                {
                    int cost = a[i - 1] == b[j - 1] ? 0 : 1;
                    d[i, j] = Math.Min(Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1), d[i - 1, j - 1] + cost);
                }

            return d[a.Length, b.Length];
        }
    }
}
