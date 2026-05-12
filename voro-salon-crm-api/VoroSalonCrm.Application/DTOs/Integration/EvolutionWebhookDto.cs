using System.Text.Json.Serialization;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public class EvolutionWebhookDto
    {
        [JsonPropertyName("event")]
        public string Event { get; set; } = string.Empty;

        [JsonPropertyName("instanceId")]
        public string InstanceId { get; set; } = string.Empty;

        [JsonPropertyName("instanceName")]
        public string? InstanceName { get; set; }

        [JsonPropertyName("instanceToken")]
        public string? InstanceToken { get; set; }

        [JsonPropertyName("data")]
        public EvolutionWebhookDataDto? Data { get; set; }
    }

    public class EvolutionWebhookDataDto
    {
        [JsonPropertyName("Info")]
        public EvolutionMessageInfoDto? Info { get; set; }

        [JsonPropertyName("Message")]
        public EvolutionMessageContentDto? Message { get; set; }

        [JsonPropertyName("IsFromMe")]
        public bool IsFromMe { get; set; }

        [JsonPropertyName("IsGroup")]
        public bool IsGroup { get; set; }

        [JsonPropertyName("IsEdit")]
        public bool IsEdit { get; set; }

        [JsonPropertyName("IsBotInvoke")]
        public bool IsBotInvoke { get; set; }
    }

    public class EvolutionMessageInfoDto
    {
        [JsonPropertyName("ID")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("IsFromMe")]
        public bool IsFromMe { get; set; }

        [JsonPropertyName("IsGroup")]
        public bool IsGroup { get; set; }

        /// <summary>JID do remetente, ex: 555399416162@s.whatsapp.net</summary>
        [JsonPropertyName("Sender")]
        public string Sender { get; set; } = string.Empty;

        /// <summary>JID do chat (mesmo que Sender em conversas individuais).</summary>
        [JsonPropertyName("Chat")]
        public string Chat { get; set; } = string.Empty;

        [JsonPropertyName("PushName")]
        public string? PushName { get; set; }

        /// <summary>Timestamp ISO 8601, ex: 2026-04-30T23:14:58-03:00</summary>
        [JsonPropertyName("Timestamp")]
        public DateTimeOffset Timestamp { get; set; }

        /// <summary>Tipo da mensagem: text, image, audio, document, etc.</summary>
        [JsonPropertyName("Type")]
        public string? Type { get; set; }
    }

    public class EvolutionMessageContentDto
    {
        /// <summary>Mensagem de texto simples.</summary>
        [JsonPropertyName("conversation")]
        public string? Conversation { get; set; }

        /// <summary>Presente quando o tipo é áudio/voz.</summary>
        [JsonPropertyName("audioMessage")]
        public EvolutionAudioMessageDto? AudioMessage { get; set; }

        /// <summary>Presente quando o tipo é imagem.</summary>
        [JsonPropertyName("imageMessage")]
        public object? ImageMessage { get; set; }

        /// <summary>Presente quando o tipo é documento.</summary>
        [JsonPropertyName("documentMessage")]
        public object? DocumentMessage { get; set; }

        /// <summary>Resposta de botão interativo.</summary>
        [JsonPropertyName("buttonsResponseMessage")]
        public EvolutionButtonResponseDto? ButtonsResponseMessage { get; set; }

        /// <summary>Resposta de lista interativa.</summary>
        [JsonPropertyName("listResponseMessage")]
        public EvolutionListResponseDto? ListResponseMessage { get; set; }
    }

    public class EvolutionAudioMessageDto
    {
        [JsonPropertyName("url")]
        public string? Url { get; set; }

        [JsonPropertyName("mediaKey")]
        public string? MediaKey { get; set; }

        [JsonPropertyName("mimetype")]
        public string? Mimetype { get; set; }
    }

    public class EvolutionButtonResponseDto
    {
        [JsonPropertyName("selectedButtonId")]
        public string? SelectedButtonId { get; set; }

        [JsonPropertyName("selectedDisplayText")]
        public string? SelectedDisplayText { get; set; }
    }

    public class EvolutionListResponseDto
    {
        [JsonPropertyName("singleSelectReply")]
        public EvolutionListSelectReplyDto? SingleSelectReply { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }
    }

    public class EvolutionListSelectReplyDto
    {
        [JsonPropertyName("selectedRowId")]
        public string? SelectedRowId { get; set; }
    }
}
