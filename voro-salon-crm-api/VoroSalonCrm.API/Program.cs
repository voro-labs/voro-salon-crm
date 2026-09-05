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
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
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

builder.Services.AddEndpointsApiExplorer();

// Liveness: responde "a aplicação subiu e o pipeline atende". Sem checar o banco de
// propósito — o health check é o que o Fly usa para decidir se mata a máquina, e uma
// oscilação do Postgres derrubando a API deixaria tudo pior, não melhor.
builder.Services.AddHealthChecks();

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

// Migration + seed rodam no deploy (release_command do fly.toml), não a cada boot.
// Antes isso ficava no caminho de startup: MigrateAsync comparando 69 migrations mais 27
// queries bloqueantes e 10 SaveChanges do seeder, tudo na frente da primeira requisição.
// Medido em produção: 22s de TTFB no primeiro acesso após ociosidade (issue #114).
if (args.Contains("--migrate"))
{
    await app.UseSeedAsync();
    return;
}

if (app.Environment.IsDevelopment())
{
    // Em Development o seed continua no startup: o custo de boot é irrelevante localmente
    // e evita exigir um passo extra (`dotnet run -- --migrate`) para levantar o ambiente.
    await app.UseSeedAsync();

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

app.UseCors("JasmimCors");

app.UseRateLimiter();

// Sem UseHttpsRedirection: o container escuta só HTTP (ASPNETCORE_URLS no Dockerfile), o TLS
// termina no proxy do Fly e o `force_https` do fly.toml já redireciona na borda. Sem porta
// HTTPS configurada o middleware não redirecionava nada, só logava warning por requisição.
app.UseAuthentication();

app.UseAuthorization();

// Depois de UseAuthentication/UseAuthorization: o middleware lê context.User e o tenant do
// token, e antes disso o usuário ainda é anônimo — registrado no topo do pipeline, ele saía
// pelo primeiro `if` em toda requisição e nunca chegava a bloquear trial vencido (issue #119).
app.UseMiddleware<SubscriptionAccessMiddleware>();

app.UseMiddleware<IdempotencyMiddleware>();

app.MapHealthChecks("/health");

app.MapControllers();

app.Run();

public partial class Program { }
