using Microsoft.AspNetCore.Mvc.Filters;

namespace VoroSalonCrm.API.Filters
{
    /// <summary>
    /// Placeholder do isolamento de tenants demo.
    /// <para>
    /// A intenção original era: para tenants marcados como demo, executar a action
    /// normalmente (devolvendo resposta real) mas fazer rollback da transação ao final,
    /// preservando os dados originais. Isso nunca foi implementado — não havia transação
    /// nem rollback, apenas uma consulta a <c>Tenants.IsDemo</c> cujo resultado era
    /// descartado, custando um round-trip ao Postgres em todo POST/PUT/PATCH/DELETE.
    /// </para>
    /// <para>
    /// A consulta morta foi removida. A decisão entre implementar o rollback de fato ou
    /// remover o filtro (o reset de demo já é coberto por <c>DemoResetService</c> e pelo
    /// cooldown em <c>AuthService.VerifyTwoFactorAsync</c>) está pendente na issue #124.
    /// </para>
    /// </summary>
    public class DemoTenantFilter : IAsyncActionFilter
    {
        public Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
            => next();
    }
}
