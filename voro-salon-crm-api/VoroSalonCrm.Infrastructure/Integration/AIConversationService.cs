using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class AIConversationService : IAIConversationService
    {
        private readonly IGeminiService _geminiService;
        private readonly IAIConversationRepository _repository;
        private readonly ILogger<AIConversationService> _logger;

        public AIConversationService(
            IGeminiService geminiService,
            IAIConversationRepository repository,
            ILogger<AIConversationService> logger)
        {
            _geminiService = geminiService;
            _repository = repository;
            _logger = logger;
        }

        public async Task<string> RespondAsync(
            Guid tenantId,
            string tenantName,
            string phoneNumber,
            string userMessage)
        {
            var systemPrompt =
                $"Você é {tenantName}, um assistente virtual de salão de beleza. " +
                "Responda de forma amigável e concisa em português. " +
                "Limite respostas a 500 caracteres.";

            var recentMessages = await _repository.GetRecentAsync(tenantId, phoneNumber, count: 10);

            var history = recentMessages
                .Select(m => (m.Role, m.Content))
                .ToList();

            var aiResponse = await _geminiService.GenerateResponseAsync(systemPrompt, history, userMessage);

            try
            {
                var userMsg = AIConversationMessage.Create(tenantId, phoneNumber, "user", Truncate(userMessage, 4000));
                await _repository.AddAsync(userMsg);

                var assistantMsg = AIConversationMessage.Create(tenantId, phoneNumber, "assistant", Truncate(aiResponse, 4000));
                await _repository.AddAsync(assistantMsg);

                await _repository.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist AI conversation messages for {PhoneNumber}.", phoneNumber);
            }

            return aiResponse;
        }

        public async Task<List<AIConversationMessage>> GetHistoryAsync(Guid tenantId, string phoneNumber)
        {
            return await _repository.GetRecentAsync(tenantId, phoneNumber, count: 50);
        }

        public async Task ClearHistoryAsync(Guid tenantId, string phoneNumber)
        {
            await _repository.ClearHistoryAsync(tenantId, phoneNumber);
        }

        private static string Truncate(string value, int maxLength) =>
            value.Length <= maxLength ? value : value[..maxLength];
    }
}
