using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Services
{
    public class BirthdayGreetingService(
        ITenantRepository tenantRepository,
        IClientRepository clientRepository,
        IWhatsappService whatsappService,
        ILogger<BirthdayGreetingService> logger) : IBirthdayGreetingService
    {
        public async Task<int> SendTodayGreetingsAsync(CancellationToken ct = default)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3)); // Brasília

            var tenants = await tenantRepository
                .Query(t => t.IsActive && t.UseWhatsappBooking && t.BirthdayWhatsappTemplateName != null)
                .ToListAsync(ct);

            int sent = 0;

            foreach (var tenant in tenants)
            {
                try
                {
                    var clients = await clientRepository
                        .Query(c => c.TenantId == tenant.Id && !c.IsDeleted
                            && c.BirthDate != null && c.Phone != null
                            && c.BirthDate.Value.Month == today.Month
                            && c.BirthDate.Value.Day == today.Day)
                        .IgnoreQueryFilters()
                        .ToListAsync(ct);

                    foreach (var client in clients)
                    {
                        try
                        {
                            var templateMsg = new WhatsappTemplateMessageDto
                            {
                                To = client.Phone!,
                                Template = new()
                                {
                                    Name = tenant.BirthdayWhatsappTemplateName!,
                                    Components =
                                    [
                                        new() {
                                            Type = "body",
                                            Parameters =
                                            [
                                                new() { Type = "text", Text = client.Name },
                                                new() { Type = "text", Text = tenant.Name }
                                            ]
                                        }
                                    ]
                                }
                            };

                            await whatsappService.SendTemplateMessageAsync(templateMsg, tenant.WhatsappPhoneNumberId, ct);
                            sent++;
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex, "Falha ao enviar parabéns para {ClientName} ({Phone}) no tenant {TenantId}.",
                                client.Name, client.Phone, tenant.Id);
                        }
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Erro ao processar parabéns para o tenant {TenantId}.", tenant.Id);
                }
            }

            return sent;
        }
    }
}
