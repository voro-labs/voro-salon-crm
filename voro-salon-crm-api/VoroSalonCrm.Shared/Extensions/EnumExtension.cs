using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Reflection;

namespace VoroSalonCrm.Shared.Extensions
{
    public static class EnumExtension
    {
        public static string AsText(this Enum value)
        {
            var type = value.GetType();

            var name = Enum.GetName(type, value);

            if (name == null) return name ?? string.Empty;
            var field = type.GetField(name);
            if (field == null) return name ?? string.Empty;
            if (Attribute.GetCustomAttribute(field, typeof(DescriptionAttribute)) is DescriptionAttribute attr)
            {
                return attr.Description;
            }

            return name ?? string.Empty;
        }

        public static T FromText<T>(string text) where T : struct, Enum
        {
            if (Enum.TryParse<T>(text, true, out var result))
            {
                return result;
            }

            throw new ArgumentException($"Invalid value for enum {typeof(T).Name}: {text}");
        }

        public static string GetDisplayName(this Enum value)
        {
            var field = value.GetType().GetField(value.ToString());
            var attribute = field?.GetCustomAttribute<DisplayAttribute>();
            return attribute?.Name ?? value.AsText();
        }
    }
}
