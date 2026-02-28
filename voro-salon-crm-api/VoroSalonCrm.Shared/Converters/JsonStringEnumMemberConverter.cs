using System.Reflection;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace VoroSalonCrm.Shared.Converters
{
    public class JsonStringEnumMemberConverter<T> : JsonConverter<T> where T : struct, Enum
    {
        public override T Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            string? enumText = reader.GetString();
            if (enumText == null)
                throw new JsonException();

            foreach (var field in typeof(T).GetFields())
            {
                if (Attribute.GetCustomAttribute(field, typeof(EnumMemberAttribute)) is EnumMemberAttribute attr)
                {
                    if (attr.Value == enumText) return (T)field.GetValue(null)!;
                }
                else if (field.Name.Equals(enumText, StringComparison.InvariantCultureIgnoreCase))
                {
                    return (T)field.GetValue(null)!;
                }
            }

            throw new JsonException($"Valor '{enumText}' não encontrado no enum {typeof(T)}");
        }

        public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
        {
            var field = typeof(T).GetField(value.ToString());
            var enumMember = field?.GetCustomAttribute<EnumMemberAttribute>();
            if (enumMember != null)
            {
                writer.WriteStringValue(enumMember.Value);
            }
            else
            {
                writer.WriteStringValue(value.ToString());
            }
        }
    }
}
