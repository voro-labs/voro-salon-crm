namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface ICurrentUserService
    {
        Guid UserId { get; }
        string Email { get; }

        bool IsAuthenticated { get; }
    }
}
