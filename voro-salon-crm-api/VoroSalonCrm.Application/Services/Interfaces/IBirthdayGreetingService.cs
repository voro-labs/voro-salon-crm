namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IBirthdayGreetingService
    {
        /// <summary>Envia parabéns via WhatsApp para todos os clientes aniversariantes do dia em todos os tenants configurados.</summary>
        Task<int> SendTodayGreetingsAsync(CancellationToken ct = default);
    }
}
