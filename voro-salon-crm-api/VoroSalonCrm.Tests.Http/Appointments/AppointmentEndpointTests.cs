using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using VoroSalonCrm.Tests.Http.Helpers;

namespace VoroSalonCrm.Tests.Http.Appointments;

public class AppointmentEndpointTests : IClassFixture<WebAppFactory>
{
    private readonly HttpClient _client;

    public AppointmentEndpointTests(WebAppFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── GET /api/v1/appointments (protegido por [Authorize]) ──────────────────

    [Fact]
    public async Task GetAppointments_Returns401_WithoutToken()
    {
        // Act
        var response = await _client.GetAsync("/api/v1/appointments");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetAppointments_DoesNotReturn500_WithValidToken()
    {
        // Arrange
        var token = AuthHelper.GenerateToken(Guid.NewGuid(), Guid.NewGuid());
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/v1/appointments");

        // Assert
        // Pode retornar 401 (user não no DB) mas nunca 500
        ((int)response.StatusCode).Should().NotBe(500);
    }

    // ── POST /api/v1/appointments sem token ───────────────────────────────────

    [Fact]
    public async Task CreateAppointment_Returns401_WithoutToken()
    {
        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/appointments", new { });

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
