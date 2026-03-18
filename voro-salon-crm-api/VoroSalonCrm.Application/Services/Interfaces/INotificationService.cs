using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Application.Services.Interfaces.Base;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface INotificationService : IServiceBase<Notification>
    {
        Task SendWelcomeAsync(string email, string userName, Tenant? tenant = null);
        Task SendResetLinkAsync(string email, string userName, string token, Tenant? tenant = null, string? redirectUri = null);
        Task SendConfirmEmailAsync(string email, string userName, string token, Tenant? tenant = null);
        Task SendTwoFactorCodeAsync(string email, string userName, string code, Tenant? tenant = null);
    }
}
