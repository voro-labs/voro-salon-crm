using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public sealed class AIConversationService(
        IGeminiService geminiService,
        IAIConversationRepository repository,
        IServiceRepository serviceRepository,
        IAppointmentRepository appointmentRepository,
        IEvolutionTemplateRepository templateRepository,
        ILogger<AIConversationService> logger) : IAIConversationService
    {
        private readonly IGeminiService _geminiService = geminiService;
        private readonly IAIConversationRepository _repository = repository;
        private readonly IServiceRepository _serviceRepository = serviceRepository;
        private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;
        private readonly IEvolutionTemplateRepository _templateRepository = templateRepository;
        private readonly ILogger<AIConversationService> _logger = logger;

        public async Task<string> RespondAsync(
            Guid tenantId,
            string tenantName,
            string phoneNumber,
            string userMessage)
        {
            var services = await _serviceRepository.GetAllAsync(
                s => s.TenantId == tenantId && !s.IsDeleted);

            var now = DateTimeOffset.UtcNow;
            var appointments = await _appointmentRepository.GetAllAsync(
                a => a.TenantId == tenantId
                     && !a.IsDeleted
                     && a.Client.Phone == phoneNumber
                     && a.ScheduledDateTime > now
                     && (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed),
                asNoTracking: true,
                q => q.Include(a => a.Client),
                q => q.Include(a => a.Service));

            var templates = await _templateRepository.GetAllAsync(t => t.IsActive);

            var servicesText = services.Any()
                ? string.Join("\n", services.Select(s => $"  - {s.Name}: R${s.Price:F0}"))
                : "  - (não informados)";

            var appointmentsText = appointments.Any()
                ? string.Join("\n", appointments
                    .OrderBy(a => a.ScheduledDateTime)
                    .Select(a => $"  - {a.Service?.Name ?? "Serviço"} em {a.ScheduledDateTime.ToLocalTime():dd/MM/yyyy} às {a.ScheduledDateTime.ToLocalTime():HH:mm}"))
                : "  - nenhum agendamento ativo";

            var templatesText = templates.Any()
                ? string.Join("\n", templates.Select(t =>
                {
                    var keywords = t.Keywords != null
                        ? JsonSerializer.Deserialize<string[]>(t.Keywords) ?? []
                        : [];
                    var kw = keywords.Length > 0 ? $" (palavras-chave: {string.Join(", ", keywords)})" : string.Empty;
                    return $"  - {t.Label}{kw}";
                }))
                : "  - (nenhum template configurado)";

            var systemPrompt = $"""
                Você é o assistente virtual do salão {tenantName}.
                Seu papel é atender clientes pelo WhatsApp de forma calorosa, ágil e profissional.

                SERVIÇOS DISPONÍVEIS:
                {servicesText}

                AGENDAMENTOS ATIVOS DESTE CLIENTE:
                {appointmentsText}

                RESPOSTAS AUTOMÁTICAS CONFIGURADAS (templates):
                {templatesText}
                Use essas informações para orientar o cliente — por exemplo, se ele perguntar
                sobre algo relacionado a um template, explique e direcione com base nele.

                DIRETRIZES:
                - Responda sempre em português, de forma amigável e objetiva.
                - Máximo 600 caracteres por mensagem.
                - Nunca invente serviços, preços ou horários que não estejam listados acima.
                - Caso não saiba responder algo, peça para o cliente aguardar ou entrar em
                  contato diretamente com o salão.
                """;

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

        public async Task<string> RespondWithContextAsync(
            Guid tenantId,
            string phoneNumber,
            string systemPrompt,
            string userMessage)
        {
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
