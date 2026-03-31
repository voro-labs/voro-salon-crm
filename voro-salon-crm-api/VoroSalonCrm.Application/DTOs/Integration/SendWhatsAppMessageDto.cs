namespace VoroSalonCrm.Application.DTOs.Integration
{
    public record SendWhatsAppMessageDto
    {
        public string To { get; init; } = string.Empty;
        public string Body { get; init; } = string.Empty;
    }
}
