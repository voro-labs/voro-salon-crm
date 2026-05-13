using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text.Json;
using VoroSalonCrm.API.Middlewares;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.Tests.Integration.Infrastructure;

public class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task Invoke_WhenExceptionThrown_Returns500WithPortugueseMessage()
    {
        // Arrange
        var logger = new Mock<ILogger<ExceptionHandlingMiddleware>>();
        var middleware = new ExceptionHandlingMiddleware(
            next: _ => throw new InvalidOperationException("boom"),
            logger: logger.Object);

        var context = new DefaultHttpContext();
        var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        context.Response.StatusCode.Should().Be(500);

        responseBody.Position = 0;
        var json = await new StreamReader(responseBody).ReadToEndAsync();
        var response = JsonSerializer.Deserialize<ResponseViewModel<object>>(json,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        response.Should().NotBeNull();
        response!.Message.Should().Be("Ocorreu um erro inesperado.");
        response.Status.Should().Be(500);
        response!.HasError.Should().BeTrue();
    }
}
