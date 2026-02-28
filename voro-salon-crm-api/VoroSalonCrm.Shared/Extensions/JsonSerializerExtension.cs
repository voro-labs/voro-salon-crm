using System.Text.Json;
using System.Text.Json.Serialization;

namespace VoroSalonCrm.Shared.Extensions
{
    public static class JsonSerializerExtension
    {
        public static JsonSerializerOptions AsDefault(this JsonSerializerOptions value)
        {
            value.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
            value.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            value.PropertyNameCaseInsensitive = true;

            return value;
        }
    }
}
