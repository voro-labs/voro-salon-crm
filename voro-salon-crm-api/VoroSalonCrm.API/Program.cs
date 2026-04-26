using Asp.Versioning;
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
    options.Filters.Add<DemoTenantFilter>();
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
