using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace VoroSalonCrm.API.Filters
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class ApiKeyAuthFilter : Attribute, IAsyncActionFilter
    {
        private const string ApiKeyHeader = "X-Api-Key";

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            if (!context.HttpContext.Request.Headers.TryGetValue(ApiKeyHeader, out var key))
            {
                context.Result = new UnauthorizedObjectResult("API Key ausente.");
                return;
            }

            var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var validKey = config["ApiKeys:BirthdayGreetings"];

            if (string.IsNullOrWhiteSpace(validKey) || key != validKey)
            {
                context.Result = new UnauthorizedObjectResult("API Key inválida.");
                return;
            }

            await next();
        }
    }
}
