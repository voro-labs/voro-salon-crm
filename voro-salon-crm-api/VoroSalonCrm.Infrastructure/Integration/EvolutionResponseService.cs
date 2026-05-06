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
        ILogger<EvolutionResponseService> logger) : IEvolutionResponseService
    {
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
                    string[] renderParams = [];
                    if (matchedTemplate.ParamsCount > 0)
                    {
                        var conversation = await conversationRepository.GetByIdAsync(
                            c => c.TenantId == msg.TenantId && c.PhoneNumber == msg.From);
                        var contactName = conversation?.ContactName ?? "Cliente";
                        renderParams = [contactName];
                    }
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
