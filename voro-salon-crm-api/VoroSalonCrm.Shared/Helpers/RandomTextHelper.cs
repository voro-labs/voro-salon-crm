namespace VoroSalonCrm.Shared.Helpers
{
    public static class RandomTextHelper
    {
        public static string GenerateRandomText
        {
            get
            {
                return Guid.NewGuid().ToString("N")[..8] + "@1Aa";
            }
        }
    }
}
