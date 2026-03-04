using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using VoroSalonCrm.Application.Services.Interfaces.Email;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Infrastructure.Email
{
    public class MailKitEmailService(IOptions<MailUtil> mailUtil) : IMailKitEmailService
    {
        private readonly MailUtil _mailUtil = mailUtil.Value;

        public async Task SendAsync(string to, string subject, string body, string? cc = null, string? bcc = null)
        {
            var message = new MimeMessage();

            message.From.Add(new MailboxAddress("Suporte", _mailUtil.From));
            message.To.Add(MailboxAddress.Parse(to));

            if (!string.IsNullOrEmpty(cc))
                message.Cc.Add(MailboxAddress.Parse(cc));

            if (!string.IsNullOrEmpty(bcc))
                message.Bcc.Add(MailboxAddress.Parse(bcc));

            message.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = body
            };

            var multipart = builder.ToMessageBody();

            if (multipart is Multipart multi)
            {
                foreach (var part in multi.OfType<TextPart>())
                {
                    part.ContentTransferEncoding = ContentEncoding.Base64;
                }
            }
            else if (multipart is TextPart text)
            {
                text.ContentTransferEncoding = ContentEncoding.Base64;
            }

            message.Body = multipart;

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(_mailUtil.SmtpServer, _mailUtil.SmtpPort, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_mailUtil.From, _mailUtil.Password);
            await smtp.SendAsync(message);
            await smtp.DisconnectAsync(true);
        }
    }
}
