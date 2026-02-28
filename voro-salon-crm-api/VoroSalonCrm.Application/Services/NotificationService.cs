using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Application.Services.Base;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using Microsoft.Extensions.Configuration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Email;

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

        public async Task SendWelcomeAsync(string email, string userName)
        {
            var template = await _notificationRepository
                .Query(n => n.Name == NotificationEnum.Welcome.AsText() && n.IsActive).FirstOrDefaultAsync();

            if (template == null)
                throw new InvalidOperationException("Template de e-mail de recepção não encontrado.");

            // Substitui placeholders no corpo e no assunto
            var subject = template.Subject
                .Replace("{UserName}", userName);

            var body = template.Body
                .Replace("{UserName}", userName);

            // Envia o e-mail usando o serviço de e-mail real
            await _emailService.SendAsync(email, subject, body, template.Cc, template.Bcc);
        }

        public async Task SendResetLinkAsync(string email, string userName, string token)
        {
            var template = await _notificationRepository
                .Query(n => n.Name == NotificationEnum.PasswordReset.AsText() && n.IsActive).FirstOrDefaultAsync();

            if (template == null)
                throw new InvalidOperationException("Template de e-mail de reset de senha não encontrado.");

            // Gera o link de reset (ajuste conforme sua URL base)
            var resetLink = $"{UrlBase}/admin/reset-password?email={email}&token={token}";

            // Substitui placeholders no corpo e no assunto
            var subject = template.Subject
                .Replace("{UserName}", userName);

            var body = template.Body
                .Replace("{UserName}", userName)
                .Replace("{ResetLink}", resetLink);

            // Envia o e-mail usando o serviço de e-mail real
            await _emailService.SendAsync(email, subject, body, template.Cc, template.Bcc);
        }

        public async Task SendConfirmEmailAsync(string email, string userName, string token)
        {
            var template = await _notificationRepository
                .Query(n => n.Name == NotificationEnum.ConfirmEmail.AsText() && n.IsActive).FirstOrDefaultAsync();

            if (template == null)
                throw new InvalidOperationException("Template de e-mail de confirmação de e-mail não encontrado.");

            // Gera o link de confirmação (ajuste conforme sua URL base)
            var confirmLink = $"{UrlBase}/admin/confirm-email?email={email}&token={token}";

            // Substitui placeholders no corpo e no assunto
            var subject = template.Subject
                .Replace("{UserName}", userName);

            var body = template.Body
                .Replace("{UserName}", userName)
                .Replace("{ConfirmLink}", confirmLink);

            // Envia o e-mail usando o serviço de e-mail real
            await _emailService.SendAsync(email, subject, body, template.Cc, template.Bcc);
        }
    }
}
