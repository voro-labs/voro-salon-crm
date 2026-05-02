namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionAIResponder
    {
        /// <summary>
        /// Monta system prompt com contexto do tenant (serviços + agendamentos ativos do cliente)
        /// e chama IAIConversationService.RespondWithContextAsync.
        /// </summary>
        Task<string> RespondAsync(Guid tenantId, string from, string bodyText, CancellationToken ct = default);
    }
}
