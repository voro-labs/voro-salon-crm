namespace VoroSalonCrm.Domain.Entities
{
    /// <summary>Template global de mensagem para Evolution Go. Sem TenantId — compartilhado entre todos os tenants.</summary>
    public class EvolutionTemplate
    {
        public Guid Id { get; set; }

        /// <summary>Chave técnica (ex: boas_vindas, lembrete_agendamento).</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Rótulo legível exibido no front.</summary>
        public string Label { get; set; } = string.Empty;

        /// <summary>Corpo da mensagem com placeholders {{1}}, {{2}}, etc.</summary>
        public string Body { get; set; } = string.Empty;

        public int ParamsCount { get; set; }

        /// <summary>JSON serializado dos labels dos parâmetros (ex: ["Nome", "Data"]).</summary>
        public string? ParamLabels { get; set; }

        /// <summary>JSON serializado de palavras-chave que ativam este template (ex: ["oi","olá","bom dia"]).
        /// Null = template não é ativado por regras automáticas.</summary>
        public string? Keywords { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
