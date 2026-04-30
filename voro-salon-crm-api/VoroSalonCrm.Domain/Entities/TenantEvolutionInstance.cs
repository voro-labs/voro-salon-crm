using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Domain.Entities
{
    public class TenantEvolutionInstance
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid TenantId { get; set; }

        /// <summary>ID da instância no servidor Evolution Go.</summary>
        public string InstanceId { get; set; } = string.Empty;

        /// <summary>Token de autenticação desta instância (gerado na criação).</summary>
        public string InstanceToken { get; set; } = string.Empty;

        /// <summary>Número de WhatsApp conectado, se houver.</summary>
        public string? PhoneNumber { get; set; }

        public EvolutionInstanceStatus Status { get; set; } = EvolutionInstanceStatus.Disconnected;

        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? ConnectedAt { get; set; }

        public Tenant Tenant { get; set; } = null!;
    }
}
