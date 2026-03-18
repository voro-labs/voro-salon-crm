namespace VoroSalonCrm.Application.DTOs
{
    public class ForgotPasswordDto
    {
        public string Email { get; set; } = string.Empty;
        /// <summary>
        /// Optional custom redirect base URL for the reset link.
        /// Use "vorosaloncrm://(auth)/reset-password" for mobile deep links.
        /// When null, defaults to the web admin URL.
        /// </summary>
        public string? RedirectUri { get; set; }
    }
}
