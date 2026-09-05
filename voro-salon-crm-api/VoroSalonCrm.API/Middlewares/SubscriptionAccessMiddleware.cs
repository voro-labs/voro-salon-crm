using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.API.Middlewares
{
    public class SubscriptionAccessMiddleware(RequestDelegate next)
    {
        private readonly RequestDelegate _next = next;

        // Só o veredito "liberado" entra no cache, e por pouco tempo. Assinatura vencida
        // não é cacheada de propósito: quem está bloqueado faz poucas requisições (a tela
        // é o paywall) e, ao assinar, volta a passar na requisição seguinte, sem depender
        // de invalidação espalhada por todo lugar que escreve TenantSubscription.
        // O preço é o inverso: um trial vence e o tenant segue passando por até um minuto.
        private static readonly TimeSpan AllowedTtl = TimeSpan.FromMinutes(1);

        public static string CacheKey(Guid tenantId) => $"subscription:access:tenant:{tenantId}";

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
            ITenantSubscriptionRepository subscriptionRepository,
            ICacheService cacheService)
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

            var cacheKey = CacheKey(tenantId);
            if (await cacheService.ExistsAsync(cacheKey, context.RequestAborted))
            {
                await _next(context);
                return;
            }

            var sub = await subscriptionRepository.GetActiveByTenantIdAsync(tenantId);

            // Bloqueia se trial expirou
            if (sub != null &&
                sub.Status == SubscriptionStatus.Trial &&
                sub.TrialEndsAt.HasValue &&
                sub.TrialEndsAt.Value < DateTimeOffset.UtcNow)
            {
                context.Response.StatusCode = 402;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(
                    "{\"success\":false,\"message\":\"Período de trial encerrado. Acesse /prices para assinar um plano.\",\"data\":null}");
                return;
            }

            // Liberado — inclui o caso sem assinatura nenhuma (conta legada ou manual)
            await cacheService.SetAsync(cacheKey, true, AllowedTtl, context.RequestAborted);

            await _next(context);
        }
    }
}
