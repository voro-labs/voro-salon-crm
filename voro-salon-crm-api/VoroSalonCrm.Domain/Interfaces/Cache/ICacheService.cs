namespace VoroSalonCrm.Domain.Interfaces.Cache
{
    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
        Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken ct = default);
        Task RemoveAsync(string key, CancellationToken ct = default);
        Task<bool> ExistsAsync(string key, CancellationToken ct = default);

        // Idempotência: armazena a resposta HTTP completa
        Task<string?> GetRawAsync(string key, CancellationToken ct = default);
        Task SetRawAsync(string key, string value, TimeSpan? expiration = null, CancellationToken ct = default);
    }
}
