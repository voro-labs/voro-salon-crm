using Asp.Versioning;
using Scalar.AspNetCore;
using System.Text.Json;
using VoroSwipeEntertainment.API.Filters;
using VoroSwipeEntertainment.API.Middlewares;
using System.Text.Json.Serialization;
using VoroSwipeEntertainment.Contract.Extensions.Configurations;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidateModelFilter>();
});

builder.Services.AddOpenApi();

builder.Services.AddHttpContextAccessor();

builder.Services
    .AddDatabase(builder.Configuration)
    .AddCustomIdentity()
    .AddJwtAuthentication(builder.Configuration)
    .AddMemoryCache()
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

app.UseCors("JasmimCors");

app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();
