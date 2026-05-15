using VoroSalonCrm.Domain.Interfaces.Entities;

namespace VoroSalonCrm.Domain.Entities
{
    public class WhatsAppTemplate : ITenantEntity
    {
        public Guid Id { get; set; }
        public Guid TenantId { get; set; }

        /// <summary>Nome técnico do template no Meta (ex: appointment_confirmation_1).</summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>Rótulo legível exibido no front (ex: Confirmação de Agendamento).</summary>
        public string Label { get; set; } = string.Empty;

        public int ParamsCount { get; set; }

        /// <summary>JSON serializado dos labels dos parâmetros.</summary>
        public string? ParamLabelsJson { get; set; }

        /// <summary>Corpo da mensagem com placeholders {{1}}, {{2}}... para renderização pelo Evolution Go.</summary>
        public string? Body { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
