using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    public class TenantDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }

        /// <summary>
        /// Tipo do estabelecimento — permite ao cliente manter o seletor coerente com o
        /// domínio acessado quando a conta tem estabelecimentos de tipos diferentes.
        /// </summary>
        public EstablishmentType EstablishmentType { get; set; }
    }
}
