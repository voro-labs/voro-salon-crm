namespace VoroSwipeEntertainment.Shared.Utils
{
    public class MailUtil
    {
        public string SmtpServer { get; set; } = string.Empty;
        public string ImapServer { get; set; } = string.Empty;
        public int SmtpPort { get; set; }
        public int ImapPort { get; set; }

        public string From { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
