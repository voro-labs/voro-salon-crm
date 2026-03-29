namespace VoroSalonCrm.Application.DTOs
{
    public class SignInDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Tipo de estabelecimento esperado pelo domínio de acesso (opcional).
        /// Quando informado, valida se a conta pertence a esse tipo antes de enviar o 2FA.
        /// </summary>
        public int? EstablishmentType { get; set; }
    }
}
