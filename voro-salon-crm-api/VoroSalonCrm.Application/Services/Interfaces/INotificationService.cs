using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Application.Services.Interfaces.Base;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface INotificationService : IServiceBase<Notification>
    {
        Task SendWelcomeAsync(string email, string userName);
        Task SendResetLinkAsync(string email, string userName, string token);
        Task SendConfirmEmailAsync(string email, string userName, string token);
    }
}
