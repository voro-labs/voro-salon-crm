namespace VoroSalonCrm.Shared.Extensions
{
    public static class StreamExtension
    {
        public static async Task<string> ToBase64Async(this Stream stream)
        {
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);

            var bytes = ms.ToArray();

            var base64 = Convert.ToBase64String(bytes);

            return base64;
        }
    }
}
