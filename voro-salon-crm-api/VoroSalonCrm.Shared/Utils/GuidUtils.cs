using System.Security.Cryptography;
using System.Text;

namespace VoroSwipeEntertainment.Shared.Utils
{
    public static class GuidUtils
    {
        public static Guid GenerateGuidFromSlug(string slug)
        {
            if (string.IsNullOrEmpty(slug))
                return Guid.NewGuid();

            using (MD5 md5 = MD5.Create())
            {
                byte[] hash = md5.ComputeHash(Encoding.UTF8.GetBytes(slug));
                return new Guid(hash);
            }
        }
    }
}
