using System.Globalization;

namespace VoroSalonCrm.Shared.Extensions
{
    public static class StringExtension
    {
        private static readonly TextInfo TextInfo =
            new CultureInfo("pt-BR", false).TextInfo;

        public static string ToTitleCase(this string value)
        {
            return TextInfo.ToTitleCase(value);
        }

        public static string ToSlug(this string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;

            var str = value.ToLowerInvariant();
            str = System.Text.RegularExpressions.Regex.Replace(str, @"[^a-z0-9\s-]", "");
            str = System.Text.RegularExpressions.Regex.Replace(str, @"\s+", " ").Trim();
            str = str.Replace(" ", "-");
            return str;
        }
    }
}
