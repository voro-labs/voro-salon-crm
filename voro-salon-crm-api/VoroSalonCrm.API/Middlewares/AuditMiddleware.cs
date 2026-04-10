using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.API.Middlewares
{
    public class AuditMiddleware(RequestDelegate next)
    {
        private readonly RequestDelegate _next = next;

        public async Task InvokeAsync(HttpContext context, ICurrentUserService currentUserService, JasmimDbContext dbContext)
        {
            var sw = Stopwatch.StartNew();

            await _next(context);

            sw.Stop();

            var auditLog = new RouteAuditLog
            {
                Method = context.Request.Method,
                Path = context.Request.Path,
                QueryString = context.Request.QueryString.ToString(),
                StatusCode = context.Response.StatusCode,
                IPAddress = context.Connection.RemoteIpAddress?.ToString(),
                DurationMs = sw.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow,
                UserId = currentUserService.UserId != Guid.Empty ? currentUserService.UserId : null,
                TenantId = currentUserService.TenantId != Guid.Empty ? currentUserService.TenantId : null
            };

            // Limpa qualquer estado pendente deixado pela lógica de negócio antes de salvar
            // apenas o RouteAuditLog. Sem isso, entidades modificadas/deletadas durante
            // a requisição podem ser re-processadas aqui causando DbUpdateConcurrencyException.
            dbContext.ChangeTracker.Clear();

            dbContext.RouteAuditLogs.Add(auditLog);
            await dbContext.SaveChangesAsync();
        }
    }
}
