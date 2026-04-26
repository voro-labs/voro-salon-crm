using System.Text.Json;
using VoroSalonCrm.API.Attributes;
using VoroSalonCrm.Domain.Interfaces.Cache;

namespace VoroSalonCrm.API.Middlewares
{
    public class IdempotencyMiddleware(RequestDelegate next, ILogger<IdempotencyMiddleware> logger)
    {
        private const string IdempotencyKeyHeader = "Idempotency-Key";

        public async Task InvokeAsync(HttpContext context, ICacheService cacheService)
        {
            // Só processa métodos de mutação
            var method = context.Request.Method;
            if (method is "GET" or "HEAD" or "OPTIONS")
            {
                await next(context);
                return;
            }

            // Verifica se o endpoint tem o atributo [Idempotent]
            var endpoint = context.GetEndpoint();
            var idempotentAttr = endpoint?.Metadata.GetMetadata<IdempotentAttribute>();
            if (idempotentAttr is null)
            {
                await next(context);
                return;
            }

            // Verifica se o header Idempotency-Key foi enviado
            if (!context.Request.Headers.TryGetValue(IdempotencyKeyHeader, out var idempotencyKey) ||
                string.IsNullOrWhiteSpace(idempotencyKey))
            {
                // Sem header — processa normalmente (não bloqueia a requisição)
                await next(context);
                return;
            }

            var cacheKey = $"idempotency:{idempotencyKey}";
            var expiration = TimeSpan.FromHours(idempotentAttr.ExpirationHours);

            // Verifica se já existe resposta cacheada
            var cachedResponse = await cacheService.GetRawAsync(cacheKey);
            if (cachedResponse is not null)
            {
                logger.LogInformation("Idempotency hit for key {Key}. Returning cached response.", idempotencyKey.ToString());

                var cached = JsonSerializer.Deserialize<IdempotencyResponse>(cachedResponse);
                if (cached is not null)
                {
                    context.Response.StatusCode = cached.StatusCode;
                    context.Response.ContentType = cached.ContentType ?? "application/json";
                    if (cached.Body is not null)
                        await context.Response.WriteAsync(cached.Body);
                    return;
                }
            }

            // Marca como "em processamento" para evitar race conditions
            var lockKey = $"idempotency-lock:{idempotencyKey}";
            var lockAcquired = !(await cacheService.ExistsAsync(lockKey));

            if (!lockAcquired)
            {
                // Outra requisição com a mesma chave está em processamento
                context.Response.StatusCode = 409;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new { message = "Requisição duplicada em processamento. Tente novamente em alguns segundos." });
                return;
            }

            // Seta lock por 30s
            await cacheService.SetRawAsync(lockKey, "processing", TimeSpan.FromSeconds(30));

            // Captura o response body
            var originalBodyStream = context.Response.Body;
            using var memoryStream = new MemoryStream();
            context.Response.Body = memoryStream;

            try
            {
                await next(context);

                // Lê o body da resposta
                memoryStream.Seek(0, SeekOrigin.Begin);
                var responseBody = await new StreamReader(memoryStream).ReadToEndAsync();

                // Armazena no cache
                var idempotencyResponse = new IdempotencyResponse
                {
                    StatusCode = context.Response.StatusCode,
                    ContentType = context.Response.ContentType,
                    Body = responseBody
                };

                var serialized = JsonSerializer.Serialize(idempotencyResponse);
                await cacheService.SetRawAsync(cacheKey, serialized, expiration);

                // Copia a resposta de volta para o stream original
                memoryStream.Seek(0, SeekOrigin.Begin);
                await memoryStream.CopyToAsync(originalBodyStream);
            }
            finally
            {
                context.Response.Body = originalBodyStream;
                await cacheService.RemoveAsync(lockKey);
            }
        }

        private sealed class IdempotencyResponse
        {
            public int StatusCode { get; set; }
            public string? ContentType { get; set; }
            public string? Body { get; set; }
        }
    }
}
