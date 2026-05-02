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

            var servicesText = services.Any()
                ? string.Join(", ", services.Select(s => $"{s.Name} - R${s.Price:F0}"))
                : "não informados";

            var appointmentsText = appointments.Any()
                ? string.Join("; ", appointments.Select(a =>
                    $"{a.Service?.Name ?? "Serviço"} em {a.ScheduledDateTime:dd/MM/yyyy} às {a.ScheduledDateTime:HH:mm}"))
                : "nenhum agendamento ativo";

            var systemPrompt =
                $"Você é o assistente virtual de {tenant.Name}. " +
                $"Serviços disponíveis: [{servicesText}]. " +
                "Responda em português, de forma amigável e concisa. Máximo 600 caracteres. " +
                $"Agendamentos ativos do cliente: [{appointmentsText}].";

            return await aiConversationService.RespondWithContextAsync(tenantId, from, systemPrompt, bodyText);
        }
    }
}
