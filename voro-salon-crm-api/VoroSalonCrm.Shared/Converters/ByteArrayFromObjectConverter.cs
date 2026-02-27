using System.Text.Json;
using System.Text.Json.Serialization;

namespace VoroSwipeEntertainment.Shared.Converters
{
    public class ByteArrayFromObjectConverter : JsonConverter<byte[]>
    {
        public override byte[] Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.StartObject)
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, byte>>(ref reader, options)!;
                return dict.OrderBy(kv => int.Parse(kv.Key))
                           .Select(kv => kv.Value)
                           .ToArray();
            }

            if (reader.TokenType == JsonTokenType.StartArray)
            {
                return JsonSerializer.Deserialize<byte[]>(ref reader, options)!;
            }

            throw new JsonException("Unexpected JSON format for byte array.");
        }

        public override void Write(Utf8JsonWriter writer, byte[] value, JsonSerializerOptions options)
        {
            writer.WriteStartArray();
            foreach (var b in value)
                writer.WriteNumberValue(b);
            writer.WriteEndArray();
        }
    }
}
