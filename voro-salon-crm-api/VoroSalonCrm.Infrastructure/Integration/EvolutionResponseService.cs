using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class EvolutionResponseService(
        ITenantEvolutionInstanceRepository instanceRepository,
        IEvolutionRulesEngine rulesEngine,
        IEvolutionTemplateService templateService,
        IEvolutionAIResponder aiResponder,
        IEvolutionService evolutionService,
        IWhatsAppMessageService whatsAppMessageService,
        IWhatsAppConversationRepository conversationRepository,
        IAppointmentRepository appointmentRepository,
        ILogger<EvolutionResponseService> logger) : IEvolutionResponseService
    {
        // Convenção de params para templates automáticos:
        // {{1}} = nome do contato
        // {{2}} = serviço do próximo agendamento
        // {{3}} = data do próximo agendamento (dd/MM/yyyy)
        // {{4}} = horário do próximo agendamento (HH:mm)
        private async Task<string[]> BuildRenderParamsAsync(Guid tenantId, string phone, int paramsCount)
        {
            var conversation = await conversationRepository.GetByIdAsync(
                c => c.TenantId == tenantId && c.PhoneNumber == phone);
            var contactName = conversation?.ContactName ?? "Cliente";

            if (paramsCount <= 1)
                return [contactName];

            var now = DateTimeOffset.UtcNow;
            var appointments = await appointmentRepository.GetAllAsync(
                a => a.TenantId == tenantId
                     && !a.IsDeleted
                     && a.Client.Phone == phone
                     && a.ScheduledDateTime > now
                     && (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed),
                asNoTracking: true,
                q => q.Include(a => a.Client),
                q => q.Include(a => a.Service));

            var next = appointments.OrderBy(a => a.ScheduledDateTime).FirstOrDefault();
            var serviceName = next?.Service?.Name ?? "";
            var date        = next != null ? next.ScheduledDateTime.ToLocalTime().ToString("dd/MM/yyyy") : "";
            var time        = next != null ? next.ScheduledDateTime.ToLocalTime().ToString("HH:mm")      : "";

            var allParams = new[] { contactName, serviceName, date, time };
            return allParams.Take(paramsCount).ToArray();
        }

        public async Task ProcessAsync(WhatsAppMessage msg, CancellationToken ct = default)
        {
            try
            {
                var instance = await instanceRepository.GetByTenantIdAsync(msg.TenantId);
                if (instance == null || instance.Status != EvolutionInstanceStatus.Connected)
                    return;

                if (string.IsNullOrWhiteSpace(msg.Body))
                    return;

                var matchedTemplate = await rulesEngine.MatchAsync(msg.Body, ct);
                string responseText;

                if (matchedTemplate != null)
                {
                    var renderParams = matchedTemplate.ParamsCount > 0
                        ? await BuildRenderParamsAsync(msg.TenantId, msg.From, matchedTemplate.ParamsCount)
                        : [];
                    responseText = await templateService.RenderAsync(matchedTemplate.Id, renderParams);
                }
                else
                {
                    responseText = await aiResponder.RespondAsync(msg.TenantId, msg.From, msg.Body, ct);
                }

                var sent = await evolutionService.SendTextAsync(instance.InstanceId, msg.From, responseText, ct);
                if (!sent)
                {
                    logger.LogWarning("Evolution send failed for message {MessageId}.", msg.Id);
                    return;
                }

                await whatsAppMessageService.SaveOutboundAsync(
                    tenantId: msg.TenantId,
                    from: instance.InstanceId,
                    to: msg.From,
                    body: responseText);

                msg.ProcessedByBotAt = DateTimeOffset.UtcNow;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error processing message {MessageId} for tenant {TenantId}.", msg.Id, msg.TenantId);
            }
            finally
            {
                msg.ProcessedByBotAt ??= DateTimeOffset.UtcNow;
            }
        }
    }
}
