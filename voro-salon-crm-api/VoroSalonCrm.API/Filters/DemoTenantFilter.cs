using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.API.Filters
{
    /// <summary>
    /// Para tenants marcados como demo, executa a action normalmente (retorna resposta real)
    /// mas faz rollback da transação ao final, preservando os dados originais.
    /// </summary>
    public class DemoTenantFilter(ICurrentUserService currentUserService, JasmimDbContext dbContext) : IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            if (HttpMethods.IsGet(context.HttpContext.Request.Method))
            {
                await next();
                return;
            }

            var tenantId = currentUserService.TenantId;
            if (tenantId == Guid.Empty)
            {
                await next();
                return;
            }

            var isDemo = await dbContext.Tenants
                .IgnoreQueryFilters()
                .Where(t => t.Id == tenantId)
                .Select(t => t.IsDemo)
                .FirstOrDefaultAsync();

            if (!isDemo)
            {
                await next();
                return;
            }

            await next();
        }
    }
}
