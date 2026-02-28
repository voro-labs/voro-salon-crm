using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.Application.Services
{
    public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

        public Guid UserId
        {
            get
            {
                var userId = _httpContextAccessor.HttpContext?.User?
                    .FindFirstValue(ClaimTypes.NameIdentifier);

                return Guid.TryParse(userId, out var id) ? id : Guid.Empty;
            }
        }

        public string Email =>
            _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email)!;

        public bool IsAuthenticated =>
            _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
    }
}
