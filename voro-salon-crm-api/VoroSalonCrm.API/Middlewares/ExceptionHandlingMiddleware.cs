using VoroSalonCrm.Application.Services.Interfaces.Email;

namespace VoroSalonCrm.API.Middlewares
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception");

                _ = Task.Run(async () =>
                {
                    try
                    {
                        var emailService = context.RequestServices.GetService<IMailKitEmailService>();
                        if (emailService is null) return;

                        var method = context.Request.Method;
                        var path = context.Request.Path;
                        var query = context.Request.QueryString;
                        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC");

                        var subject = $"[Jasmim] Erro: {ex.GetType().Name} em {method} {path}";

                        var body = $@"
<h2 style='color:#d32f2f;'>Erro no sistema Jasmim</h2>
<table style='border-collapse:collapse; font-family:monospace; font-size:13px;'>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Timestamp</td><td>{timestamp}</td></tr>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Rota</td><td>{method} {path}{query}</td></tr>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Exceção</td><td>{ex.GetType().FullName}</td></tr>
  <tr><td style='padding:4px 12px 4px 0; font-weight:bold;'>Mensagem</td><td>{ex.Message}</td></tr>
</table>
<h3>Stack Trace</h3>
<pre style='background:#f5f5f5; padding:12px; border-radius:4px; font-size:12px; overflow-x:auto;'>{ex.StackTrace}</pre>
{(ex.InnerException is not null ? $@"
<h3>Inner Exception</h3>
<p><strong>{ex.InnerException.GetType().FullName}:</strong> {ex.InnerException.Message}</p>
<pre style='background:#f5f5f5; padding:12px; border-radius:4px; font-size:12px; overflow-x:auto;'>{ex.InnerException.StackTrace}</pre>
" : "")}";

                        await emailService.SendAsync("log@vorolabs.app", subject, body);
                    }
                    catch (Exception emailEx)
                    {
                        _logger.LogError(emailEx, "Failed to send error notification email");
                    }
                });

                context.Response.StatusCode = 500;
                await context.Response.WriteAsJsonAsync(new { message = "An unexpected error occurred." });
            }
        }
    }
}
