namespace VoroSalonCrm.Shared.Utils
{
    public class ConfigUtil
    {
        public ConnectionDB? ConnectionDB { get; set; }
        public string? JwtKey { get; set; }
    }

    public class ConnectionDB
    {
        public string? Prod { get; set; }
        public string? Dev { get; set; }
    }
}
