using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Application.Services.Interfaces.Integration
{
    public interface IEvolutionRulesEngine
    {
        /// <summary>
        /// Verifica se bodyText contém alguma keyword de template ativo.
        /// Retorna o primeiro template com match (por CreatedAt ASC) ou null.
        /// </summary>
        Task<EvolutionTemplate?> MatchAsync(string bodyText, CancellationToken ct = default);
    }
}
