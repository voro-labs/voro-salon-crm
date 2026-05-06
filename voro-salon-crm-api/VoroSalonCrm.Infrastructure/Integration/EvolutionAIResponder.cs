using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionAIResponder(
        ITenantService tenantService,
        IServiceRepository serviceRepository,
        IAppointmentRepository appointmentRepository,
        IEvolutionTemplateRepository templateRepository,
        IAIConversationService aiConversationService) : IEvolutionAIResponder
    {
        public async Task<string> RespondAsync(Guid tenantId, string from, string bodyText, CancellationToken ct = default)
        {
            var tenant = await tenantService.GetByIdAsync(tenantId)
                ?? throw new InvalidOperationException($"Tenant {tenantId} not found.");

            var services = await serviceRepository.GetAllAsync(
                s => s.TenantId == tenantId && !s.IsDeleted);

            var now = DateTimeOffset.UtcNow;
            var appointments = await appointmentRepository.GetAllAsync(
                a => a.TenantId == tenantId
                     && !a.IsDeleted
                     && a.Client.Phone == from
                     && a.ScheduledDateTime > now
                     && (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed),
                asNoTracking: true,
                q => q.Include(a => a.Client),
                q => q.Include(a => a.Service));

            var templates = await templateRepository.GetAllAsync(
                t => t.IsActive);

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
                        : Array.Empty<string>();
                    var kw = keywords.Length > 0 ? $" (palavras-chave: {string.Join(", ", keywords)})" : string.Empty;
                    return $"  - {t.Label}{kw}";
                }))
                : "  - (nenhum template configurado)";

            var systemPrompt = $"""
                Você é o assistente virtual do salão {tenant.Name}.
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

            return await aiConversationService.RespondWithContextAsync(tenantId, from, systemPrompt, bodyText);
        }
    }
}
