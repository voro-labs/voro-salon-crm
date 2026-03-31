using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Roda diariamente e envia aviso de créditos próximos do vencimento
    /// para clientes com memberships ativas e EndDate dentro de 7 dias.
    /// </summary>
    public class MembershipExpirationNotificationJob(
        IServiceScopeFactory scopeFactory,
        ILogger<MembershipExpirationNotificationJob> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("MembershipExpirationNotificationJob started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessNotificationsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error processing membership expiration notifications.");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task ProcessNotificationsAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();
            var whatsapp = scope.ServiceProvider.GetRequiredService<IWhatsappService>();

            var now = DateTimeOffset.UtcNow;
            var threshold = now.AddDays(7);
            var noticeCooldown = now.AddDays(-7);

            var memberships = await db.Set<ClientMembership>()
                .Include(m => m.Client)
                .Include(m => m.Plan)
                .Include(m => m.Tenant)
                .Where(m =>
                    m.Status == ClientMembershipStatus.Active &&
                    m.EndDate >= now &&
                    m.EndDate <= threshold &&
                    (m.RemainingSessions == null || m.RemainingSessions > 0) &&
                    (m.LastExpirationNoticeSentAt == null || m.LastExpirationNoticeSentAt <= noticeCooldown) &&
                    m.Client.Phone != null)
                .ToListAsync(ct);

            if (memberships.Count == 0) return;

            logger.LogInformation("Sending expiration notices for {Count} memberships.", memberships.Count);

            foreach (var membership in memberships)
            {
                try
                {
                    var phoneNumberId = membership.Tenant?.WhatsappPhoneNumberId;
                    var phone = membership.Client.Phone!.Replace(" ", "").Replace("-", "").Replace("(", "").Replace(")", "");
                    var expiryDate = membership.EndDate.ToOffset(TimeSpan.FromHours(-3)).ToString("dd/MM/yyyy");

                    string sessionsText;

                    if (membership.RemainingSessions == null)
                    {
                        sessionsText = "Seu plano possui sessões ilimitadas";
                    }
                    else if (membership.RemainingSessions > 0)
                    {
                        sessionsText = $"Restam {membership.RemainingSessions} sessões no seu plano";
                    }
                    else
                    {
                        sessionsText = "Você já utilizou todas as sessões do plano";
                    }

                    var templateMsg = new WhatsappTemplateMessageDto
                    {
                        To = phone,
                        Template = new WhatsappTemplateDto
                        {
                            Name = "membership_expiring_soon",
                            Language = new WhatsappLanguageDto { Code = "pt_BR" },
                            Components = new List<WhatsappComponentDto>
                            {
                                new()
                                {
                                    Type = "body",
                                    Parameters = new List<WhatsappParameterDto>
                                    {
                                        new() { Type = "text", Text = membership.Client.Name },
                                        new() { Type = "text", Text = sessionsText },
                                        new() { Type = "text", Text = expiryDate },
                                    }
                                }
                            }
                        }
                    };

                    var sent = await whatsapp.SendTemplateMessageAsync(templateMsg, phoneNumberId, ct);

                    if (sent)
                    {
                        membership.LastExpirationNoticeSentAt = now;
                        db.Set<ClientMembership>().Update(membership);
                        logger.LogInformation("Expiration notice sent for membership {Id}.", membership.Id);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to send expiration notice for membership {Id}.", membership.Id);
                }
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
