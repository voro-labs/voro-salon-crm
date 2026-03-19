namespace VoroSalonCrm.Application.DTOs.Auth
{
    public class CompleteProfileDto
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string CountryCode { get; set; } = string.Empty;
        public DateTimeOffset? BirthDate { get; set; }
    }
}
