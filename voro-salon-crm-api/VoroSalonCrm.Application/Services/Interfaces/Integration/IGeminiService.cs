namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IGeminiService
    {
        Task<string> GenerateResponseAsync(
            string systemPrompt,
            List<(string role, string content)> history,
            string userMessage);
    }
}
