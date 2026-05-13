using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using VoroSalonCrm.API.Controllers;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.Tests.Integration.Auth;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _authServiceMock;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _authServiceMock = new Mock<IAuthService>();
        _controller = new AuthController(_authServiceMock.Object);
    }

    // ── SignIn ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task SignIn_Returns200_OnSuccess()
    {
        // Arrange
        var dto = new SignInDto { Email = "user@test.com", Password = "password123" };
        var authDto = new AuthDto { Email = dto.Email, Token = "jwt-token" };

        _authServiceMock
            .Setup(s => s.SignInAsync(dto))
            .ReturnsAsync(authDto);

        // Act
        var result = await _controller.SignIn(dto);

        // Assert
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(200);

        var response = objectResult.Value.Should().BeOfType<ResponseViewModel<AuthDto>>().Subject;
        response.Status.Should().Be(200);
        response.Data.Should().Be(authDto);
    }

    [Fact]
    public async Task SignIn_Returns500WithFailResponse_WhenUnauthorizedExceptionThrown()
    {
        // Arrange — controller catches ALL exceptions and wraps in ResponseViewModel.Fail (status 500)
        var dto = new SignInDto { Email = "user@test.com", Password = "wrong-password" };

        _authServiceMock
            .Setup(s => s.SignInAsync(dto))
            .ThrowsAsync(new UnauthorizedAccessException("Invalid credentials."));

        // Act
        var result = await _controller.SignIn(dto);

        // Assert — controller always returns an ObjectResult (never throws), status is 500 from Fail()
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);

        var response = objectResult.Value.Should().BeAssignableTo<ResponseViewModel<AuthDto>>().Subject;
        response.Status.Should().Be(500);
        response.Message.Should().Contain("Invalid credentials.");
    }

    // ── ForgotPassword ────────────────────────────────────────────────────────

    [Fact]
    public async Task ForgotPassword_Returns200_WhenServiceSucceeds()
    {
        // Arrange
        var dto = new ForgotPasswordDto { Email = "user@test.com" };

        _authServiceMock
            .Setup(s => s.ForgotPasswordAsync(dto))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _controller.ForgotPassword(dto);

        // Assert
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(200);

        var response = objectResult.Value.Should().BeAssignableTo<ResponseViewModel<object>>().Subject;
        response.Status.Should().Be(200);
        response.Message.Should().Be("Forgot-password successful.");
    }

    [Fact]
    public async Task ForgotPassword_Returns500WithFailResponse_WhenServiceThrows()
    {
        // Arrange
        var dto = new ForgotPasswordDto { Email = "nonexistent@test.com" };

        _authServiceMock
            .Setup(s => s.ForgotPasswordAsync(dto))
            .ThrowsAsync(new Exception("User not found."));

        // Act
        var result = await _controller.ForgotPassword(dto);

        // Assert — controller catches exception and returns ResponseViewModel.Fail
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);

        var response = objectResult.Value.Should().BeAssignableTo<ResponseViewModel<object>>().Subject;
        response.Status.Should().Be(500);
        response.Message.Should().Contain("User not found.");
    }
}
