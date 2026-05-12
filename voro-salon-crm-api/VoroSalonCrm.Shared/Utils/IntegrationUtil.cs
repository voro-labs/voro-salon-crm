namespace VoroSalonCrm.Shared.Utils
{
    public class IntegrationUtil
    {
        public WhatsappUtil Whatsapp { get; set; } = null!;
    }

    public class WhatsappUtil
    {
        public string Token { get; set; } = string.Empty;
        public string PhoneId { get; set; } = string.Empty;
        public string BussinessId { get; set; } = string.Empty;
        public string VerifyToken { get; set; } = string.Empty;
        // Embedded Signup (Tech Provider)
        public string AppId { get; set; } = string.Empty;
        public string AppSecret { get; set; } = string.Empty;
        public string MasterAccessToken { get; set; } = string.Empty;
        public string ConfigId { get; set; } = string.Empty;
        // Evolution Go — apenas configuração global (tokens por tenant ficam no banco)
        public string Provider { get; set; } = "meta";
        public string ApiPublicUrl { get; set; } = string.Empty;
        public string EvolutionUrl { get; set; } = string.Empty;
        public string EvolutionAdminToken { get; set; } = string.Empty;
    }
}
