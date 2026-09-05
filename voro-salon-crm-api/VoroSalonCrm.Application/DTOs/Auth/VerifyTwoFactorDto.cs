namespace VoroSalonCrm.Application.DTOs.Auth
{
    public class VerifyTwoFactorDto
    {
        public string PendingToken { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// Tipo de estabelecimento do domínio de acesso (opcional), igual ao enviado no
        /// sign-in. Define qual estabelecimento da conta será conectado na sessão.
        /// </summary>
        public int? EstablishmentType { get; set; }
    }
}
