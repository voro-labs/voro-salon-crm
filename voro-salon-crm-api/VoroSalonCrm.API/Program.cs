using Asp.Versioning;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Scalar.AspNetCore;
using System.Text.Json;
using VoroSalonCrm.API.Filters;
using VoroSalonCrm.API.Middlewares;
using System.Text.Json.Serialization;
using VoroSalonCrm.Contract.Extensions.Configurations;
using VoroSalonCrm.Shared.ViewModels;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidateModelFilter>();

    // DemoTenantFilter foi desregistrado: hoje ele é um pass-through puro, então mantê-lo
    // custava uma alocação e um hop de pipeline por requisição sem fazer nada. A classe
    // continua no repositório documentando a intenção original (rollback para tenants demo),
    // pendente de decisão na issue #124.
});

builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(e => e.Value?.Errors.Count > 0)
            .Select(e => $"{e.Key}: {string.Join("; ", e.Value!.Errors.Select(err => err.ErrorMessage))}")
            .ToList();

        var message = string.IsNullOrWhiteSpace(string.Join("", errors))
            ? "Dados inválidos na requisição."
            : string.Join(" | ", errors);

        var response = ResponseViewModel<object>.Fail(message, status: 400);
        return new BadRequestObjectResult(response);
    };
});

builder.Services.AddOpenApi();

// A API roda atrás do proxy do Fly, que termina o TLS e encaminha via rede interna.
// Sem isso, Connection.RemoteIpAddress é sempre o IP do edge do Fly — o mesmo para todos
// os clientes — o que colapsava o rate limit de login numa única partição global de
// 5 req/min para o produto inteiro, e gravava o IP errado no audit log (issue #118).
//
// KnownNetworks/KnownProxies são limpos porque o IP interno do proxy do Fly é dinâmico.
// Isso é seguro aqui porque a aplicação só é alcançável através do proxy: o container
// escuta na porta 8080 da rede privada, sem exposição pública direta.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddHttpContextAccessor();

builder.Services
    .AddDatabase(builder.Configuration, builder.Environment)
    .AddCustomIdentity()
    .AddJwtAuthentication(builder.Configuration)
    .AddRateLimitingConf()
    .AddMemoryCache()
    .AddRedisCache(builder.Configuration)
    .AddLogging()
    .AddHttpContextAccessor()
    .AddHttpClient()
    .AddAutoMapperConfig()
    .AddApplicationServices(builder.Configuration)
    .AddCustomCors(builder.Configuration);

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.ReportApiVersions = true;
    options.RouteConstraintName = "version";
    options.UnsupportedApiVersionStatusCode = 400;
})
.AddApiExplorer(options =>
{
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

var app = builder.Build();

await app.UseSeedAsync();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithTitle("Jasmim")
            .WithTheme(ScalarTheme.Saturn)
            .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });
}

// Primeiro middleware do pipeline: tudo abaixo (auditoria, rate limiter, redirect de HTTPS)
// precisa enxergar o IP e o protocolo reais do cliente, não os do proxy do Fly (issue #118).
app.UseForwardedHeaders();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseMiddleware<AuditMiddleware>();

app.UseMiddleware<SubscriptionAccessMiddleware>();

app.UseCors("JasmimCors");

app.UseRateLimiter();

app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.UseMiddleware<IdempotencyMiddleware>();

app.MapControllers();

app.Run();

public partial class Program { }
