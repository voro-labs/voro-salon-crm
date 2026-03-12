namespace VoroSalonCrm.Application.DTOs.Integration
{
    public class WhatsappTemplateMessageDto
    {
        public string To { get; set; } = string.Empty;
        public WhatsappTemplateDto Template { get; set; } = new();
    }

    public class WhatsappTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public WhatsappLanguageDto Language { get; set; } = new();
        public List<WhatsappComponentDto>? Components { get; set; }
    }

    public class WhatsappLanguageDto
    {
        public string Code { get; set; } = "pt_BR";
    }

    public class WhatsappComponentDto
    {
        public string Type { get; set; } = "body";
        public string? SubType { get; set; }
        public string? Index { get; set; }
        public List<WhatsappParameterDto> Parameters { get; set; } = new();
    }

    public class WhatsappParameterDto
    {
        public string Type { get; set; } = "text";
        public string? ParameterName { get; set; }
        public string? Text { get; set; }
    }
}
