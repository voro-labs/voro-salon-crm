using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public class SendTemplateToClientsDto
    {
        [Required]
        public List<Guid> ClientIds { get; set; } = new();

        [Required]
        public string TemplateName { get; set; } = string.Empty;

        public string Language { get; set; } = "pt_BR";

        /// <summary>Valores para os parâmetros do corpo {{1}}, {{2}}, etc.</summary>
        public List<string> BodyParams { get; set; } = new();
    }

    public record SendTemplateResultDto(
        Guid ClientId,
        string ClientName,
        string Phone,
        bool Success,
        string? Error
    );


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
