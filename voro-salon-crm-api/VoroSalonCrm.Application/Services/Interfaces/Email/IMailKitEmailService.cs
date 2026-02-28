namespace VoroSalonCrm.Application.Services.Interfaces.Email
{
    public interface IMailKitEmailService
    {
        Task SendAsync(string to, string subject, string body, string? cc = null, string? bcc = null);
    }
}
