namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionService
    {
        Task<bool> SendTextAsync(string instanceId, string to, string text, CancellationToken ct = default);
    }
}
