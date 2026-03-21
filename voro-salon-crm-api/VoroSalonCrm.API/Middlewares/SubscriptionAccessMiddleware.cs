using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.API.Middlewares
{
    public class SubscriptionAccessMiddleware(RequestDelegate next)
    {
        private readonly RequestDelegate _next = next;

        private static readonly string[] BypassSegments =
        [
            "/subscription",
            "/auth",
            "/public-booking",
            "/admin",
            "/health",
            "/scalar",
            "/openapi",
        ];

        public async Task InvokeAsync(
            HttpContext context,
            ICurrentUserService currentUserService,
            ITenantSubscriptionRepository subscriptionRepository)
        {
            // Apenas usuários autenticados com tenant
            if (!(context.User.Identity?.IsAuthenticated ?? false))
            {
                await _next(context);
                return;
            }

            var tenantId = currentUserService.TenantId;
            if (tenantId == Guid.Empty)
            {
                await _next(context);
                return;
            }

            // Bypass para rotas públicas / admin
            var path = context.Request.Path.Value?.ToLower() ?? "";
            if (BypassSegments.Any(path.Contains))
            {
                await _next(context);
                return;
            }

            var sub = await subscriptionRepository.GetActiveByTenantIdAsync(tenantId);

            // Sem assinatura: permite (pode ser conta legada ou manual)
            if (sub == null)
            {
                await _next(context);
                return;
            }

            // Bloqueia se trial expirou
            if (sub.Status == SubscriptionStatus.Trial &&
                sub.TrialEndsAt.HasValue &&
                sub.TrialEndsAt.Value < DateTimeOffset.UtcNow)
            {
                context.Response.StatusCode = 402;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(
                    "{\"success\":false,\"message\":\"Período de trial encerrado. Acesse /prices para assinar um plano.\",\"data\":null}");
                return;
            }

            await _next(context);
        }
    }
}
