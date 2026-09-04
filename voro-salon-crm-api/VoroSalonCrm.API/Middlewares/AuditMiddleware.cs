using System.Diagnostics;
using Microsoft.AspNetCore.Http;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Auditing;

namespace VoroSalonCrm.API.Middlewares
{
    public class AuditMiddleware(RequestDelegate next)
    {
        private readonly RequestDelegate _next = next;
        private const int MaxBodyLength = 8192;

        public async Task InvokeAsync(HttpContext context, ICurrentUserService currentUserService, IRouteAuditQueue auditQueue)
        {
            string? requestBody = null;

            if (HttpMethods.IsPost(context.Request.Method)
                || HttpMethods.IsPut(context.Request.Method)
                || HttpMethods.IsPatch(context.Request.Method))
            {
                var contentType = context.Request.ContentType ?? "";
                // Skip binary/multipart bodies — they contain raw bytes (0x00)
                // that PostgreSQL cannot store in text columns.
                if (!contentType.StartsWith("multipart/", StringComparison.OrdinalIgnoreCase))
                {
                    context.Request.EnableBuffering();
                    using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
                    requestBody = await reader.ReadToEndAsync();
                    if (requestBody.Length > MaxBodyLength)
                        requestBody = requestBody[..MaxBodyLength] + "...[truncated]";
                    context.Request.Body.Position = 0;
                }
            }

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
                TenantId = currentUserService.TenantId != Guid.Empty ? currentUserService.TenantId : null,
                RequestBody = requestBody
            };

            // Enfileira e retorna. A gravação acontece em lote no RouteAuditWriter, fora do
            // caminho da resposta — antes havia um SaveChangesAsync síncrono aqui, somando um
            // round-trip ao Postgres em toda requisição HTTP (issue #115).
            //
            // Não é mais necessário limpar o ChangeTracker: o middleware não compartilha mais
            // o DbContext da requisição, então não há risco de re-processar entidades
            // modificadas pela lógica de negócio.
            auditQueue.TryEnqueue(auditLog);
        }
    }
}
