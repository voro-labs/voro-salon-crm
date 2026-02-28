namespace VoroSalonCrm.Application.DTOs
{
    public class AuthDto
    {
        public string? UserId { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? UserName { get; set; }
        public string? Email { get; set; }
        public DateTimeOffset? Expiration { get; set; }
        public string? Token { get; set; }

        public AuthDto() { }

        public AuthDto(string email, string token)
        {
            Email = email;
            Token = token;
        }

        public AuthDto(string userId, string token, DateTimeOffset expiration)
        {
            UserId = userId;
            Token = token;
            Expiration = expiration;
        }
    }
}
