using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace VoroSalonCrm.Tests.Http.Helpers;

/// <summary>
/// Gera JWT válidos para autenticar requisições HTTP nos testes.
/// A chave e issuer batem com as configurações de appsettings.Testing.json.
/// </summary>
public static class AuthHelper
{
    internal const string TestKey    = "test-secret-key-32-chars-minimum!!";
    internal const string TestIssuer = "test-issuer";
    internal const string TestAud    = "test-audience";

    public static string GenerateToken(
        Guid userId,
        Guid tenantId,
        string role = "salonOwner",
        int expiresInHours = 1)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim("tenantId", tenantId.ToString()),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
        };

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer            : TestIssuer,
            audience          : TestAud,
            claims            : claims,
            expires           : DateTime.UtcNow.AddHours(expiresInHours),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
