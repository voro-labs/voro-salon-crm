using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Email;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Shared.Extensions;

namespace VoroSalonCrm.Application.Services
{
    public class NotificationService(IMailKitEmailService emailService, IConfiguration configuration, INotificationRepository notificationRepository) : ServiceBase<Notification>(notificationRepository), INotificationService
    {
        private readonly IConfiguration _configuration = configuration;
        private readonly IMailKitEmailService _emailService = emailService;
        private readonly INotificationRepository _notificationRepository = notificationRepository;

        private string UrlBase =>
            _configuration
                .GetSection("CorsSettings")
                .GetSection("AllowedOrigins")
                .Get<string[]>()?[0] ?? "{UrlBase}";

        public async Task SendWelcomeAsync(string email, string userName, Tenant? tenant = null)
        {
            var template = await _notificationRepository
                .Query(n => n.Name == NotificationEnum.Welcome.AsText() && n.IsActive).FirstOrDefaultAsync();

            if (template == null)
                throw new InvalidOperationException("Template de e-mail de recepção não encontrado.");

            var subject = template.Subject
                .Replace("{UserName}", userName);

            var body = template.Body
                .Replace("{UserName}", userName);

            body = ApplyTenantPlaceholders(body, tenant);
            subject = ApplyTenantPlaceholders(subject, tenant);

            await _emailService.SendAsync(email, subject, body, template.Cc, template.Bcc);
        }

        public async Task SendResetLinkAsync(string email, string userName, string token, Tenant? tenant = null)
        {
            var template = await _notificationRepository
                .Query(n => n.Name == NotificationEnum.PasswordReset.AsText() && n.IsActive).FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Template de e-mail de reset de senha não encontrado.");

            var resetLink = $"{UrlBase}/admin/reset-password?email={Uri.EscapeDataString(email)}&token={token}";

            var subject = template.Subject
                .Replace("{UserName}", userName);

            var body = template.Body
                .Replace("{UserName}", userName)
                .Replace("{ResetLink}", resetLink);

            body = ApplyTenantPlaceholders(body, tenant);
            subject = ApplyTenantPlaceholders(subject, tenant);

            await _emailService.SendAsync(email, subject, body, template.Cc, template.Bcc);
        }

        public async Task SendConfirmEmailAsync(string email, string userName, string token, Tenant? tenant = null)
        {
            var template = await _notificationRepository
                .Query(n => n.Name == NotificationEnum.ConfirmEmail.AsText() && n.IsActive).FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Template de e-mail de confirmação de e-mail não encontrado.");

            var confirmLink = $"{UrlBase}/admin/confirm-email?email={Uri.EscapeDataString(email)}&token={token}";

            var subject = template.Subject
                .Replace("{UserName}", userName);

            var body = template.Body
                .Replace("{UserName}", userName)
                .Replace("{ConfirmLink}", confirmLink);

            body = ApplyTenantPlaceholders(body, tenant);
            subject = ApplyTenantPlaceholders(subject, tenant);

            await _emailService.SendAsync(email, subject, body, template.Cc, template.Bcc);
        }

        // ── Substitui todos os placeholders relacionados ao tenant ──────────────

        private static string ApplyTenantPlaceholders(string text, Tenant? tenant)
        {
            if (tenant == null) return text;

            return text
                .Replace("{TenantName}",         tenant.Name)
                .Replace("{TenantSlug}",          tenant.Slug)
                .Replace("{TenantEmail}",         tenant.ContactEmail ?? string.Empty)
                .Replace("{TenantPhone}",         tenant.ContactPhone ?? string.Empty)
                .Replace("{TenantLogoUrl}",       tenant.LogoUrl ?? string.Empty)
                .Replace("{TenantPrimaryColor}",  tenant.PrimaryColor)
                .Replace("{TenantSecondaryColor}", tenant.SecondaryColor);
        }
    }
}
