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
    }
}
