namespace VoroSalonCrm.Shared.Utils
{
    public class ConfigUtil
    {
        public ConnectionString? ConnectionString { get; set; }
        public string? ConnectionDB { get; set; }
        public string? JwtKey { get; set; }
    }

    public class ConnectionString
    {
        public string? Production { get; set; }
        public string? Development { get; set; }
    }
}
