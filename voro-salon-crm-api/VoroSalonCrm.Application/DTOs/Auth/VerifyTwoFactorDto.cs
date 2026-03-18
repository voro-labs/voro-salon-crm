namespace VoroSalonCrm.Application.DTOs.Auth
{
    public class VerifyTwoFactorDto
    {
        public string PendingToken { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }
}
