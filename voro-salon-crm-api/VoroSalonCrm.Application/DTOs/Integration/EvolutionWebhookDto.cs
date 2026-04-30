using System.Text.Json.Serialization;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public class EvolutionWebhookDto
    {
        [JsonPropertyName("event")]
        public string Event { get; set; } = string.Empty;

        [JsonPropertyName("instanceId")]
        public string InstanceId { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public EvolutionWebhookDataDto? Data { get; set; }
    }

    public class EvolutionWebhookDataDto
    {
        [JsonPropertyName("key")]
        public EvolutionMessageKeyDto Key { get; set; } = new();

        [JsonPropertyName("message")]
        public EvolutionMessageContentDto? Message { get; set; }

        [JsonPropertyName("messageTimestamp")]
        public long MessageTimestamp { get; set; }

        [JsonPropertyName("pushName")]
        public string? PushName { get; set; }
    }

    public class EvolutionMessageKeyDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("fromMe")]
        public bool FromMe { get; set; }

        [JsonPropertyName("remoteJid")]
        public string RemoteJid { get; set; } = string.Empty;
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
