using System.Text.Json.Serialization;

namespace VoroSalonCrm.Application.DTOs.Integration
{
    public class WhatsappWebhookDto
    {
        [JsonPropertyName("object")]
        public string Object { get; set; } = string.Empty;

        [JsonPropertyName("entry")]
        public List<WhatsappEntryDto> Entry { get; set; } = new();
    }

    public class WhatsappEntryDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("changes")]
        public List<WhatsappChangeDto> Changes { get; set; } = new();
    }

    public class WhatsappChangeDto
    {
        [JsonPropertyName("value")]
        public WhatsappValueDto Value { get; set; } = new();

        [JsonPropertyName("field")]
        public string Field { get; set; } = string.Empty;
    }

    public class WhatsappValueDto
    {
        [JsonPropertyName("messaging_product")]
        public string MessagingProduct { get; set; } = string.Empty;

        [JsonPropertyName("metadata")]
        public WhatsappMetadataDto Metadata { get; set; } = new();

        [JsonPropertyName("contacts")]
        public List<WhatsappContactDto>? Contacts { get; set; }

        [JsonPropertyName("messages")]
        public List<WhatsappMessageDto>? Messages { get; set; }
    }

    public class WhatsappMetadataDto
    {
        [JsonPropertyName("display_phone_number")]
        public string DisplayPhoneNumber { get; set; } = string.Empty;

        [JsonPropertyName("phone_number_id")]
        public string PhoneNumberId { get; set; } = string.Empty;
    }

    public class WhatsappContactDto
    {
        [JsonPropertyName("profile")]
        public WhatsappProfileDto Profile { get; set; } = new();

        [JsonPropertyName("wa_id")]
        public string WaId { get; set; } = string.Empty;
    }

    public class WhatsappProfileDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
    }

    public class WhatsappMessageDto
    {
        [JsonPropertyName("from")]
        public string From { get; set; } = string.Empty;

        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("timestamp")]
        public string Timestamp { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("text")]
        public WhatsappTextDto? Text { get; set; }

        [JsonPropertyName("audio")]
        public WhatsappAudioDto? Audio { get; set; }

        [JsonPropertyName("interactive")]
        public WhatsappInteractiveDto? Interactive { get; set; }
    }

    public class WhatsappTextDto
    {
        [JsonPropertyName("body")]
        public string Body { get; set; } = string.Empty;
    }

    public class WhatsappAudioDto
    {
        [JsonPropertyName("mime_type")]
        public string MimeType { get; set; } = string.Empty;

        [JsonPropertyName("sha256")]
        public string Sha256 { get; set; } = string.Empty;

        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("voice")]
        public bool Voice { get; set; }
    }

    public class WhatsappInteractiveDto
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("button_reply")]
        public WhatsappButtonReplyDto? ButtonReply { get; set; }

        [JsonPropertyName("list_reply")]
        public WhatsappListReplyDto? ListReply { get; set; }
    }

    public class WhatsappButtonReplyDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;
    }

    public class WhatsappListReplyDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;
    }
}
