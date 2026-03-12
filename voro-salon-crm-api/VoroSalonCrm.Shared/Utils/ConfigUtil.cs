namespace VoroSalonCrm.Shared.Utils
{
    public class ConfigUtil
    {
        public ConnectionString ConnectionString { get; set; } = null!;
        public string JwtKey { get; set; } = null!;
    }

    public class ConnectionString
    {
        public ConnectionStringDetail Production { get; set; } = null!;
        public ConnectionStringDetail Development { get; set; } = null!;
    }

    public class ConnectionStringDetail
    {
        public string? Server { get; set; }
        public string? Port { get; set; }
        public string? Database { get; set; }
        public string? UserId { get; set; }
        public string? Password { get; set; }
    }
}
