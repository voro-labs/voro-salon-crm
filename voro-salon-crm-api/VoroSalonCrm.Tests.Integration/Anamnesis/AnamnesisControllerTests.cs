using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using VoroSalonCrm.API.Controllers;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.Tests.Integration.Anamnesis;

public class AnamnesisControllerTests
{
    private readonly Mock<IAnamnesisService> _anamnesisServiceMock;
    private readonly AnamnesisController _controller;

    public AnamnesisControllerTests()
    {
        _anamnesisServiceMock = new Mock<IAnamnesisService>();
        _controller = new AnamnesisController(_anamnesisServiceMock.Object);
    }

    // ── GetQuestions ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetQuestions_Returns200_WithQuestions()
    {
        // Arrange
        var questions = new List<AnamnesisQuestionDto>
        {
            new(
                Id        : Guid.NewGuid(),
                Identifier: "q1",
                Label     : "Do you have allergies?",
                Placeholder: null,
                FieldType : AnamnesisFieldType.Boolean,
                Options   : null,
                Section   : AnamnesisSection.GeneralHealth,
                Order     : 1,
                IsRequired: true
            ),
            new(
                Id        : Guid.NewGuid(),
                Identifier: "q2",
                Label     : "Describe your main complaint.",
                Placeholder: "Type here...",
                FieldType : AnamnesisFieldType.LongText,
                Options   : null,
                Section   : AnamnesisSection.MainComplaint,
                Order     : 2,
                IsRequired: true
            )
        };

        _anamnesisServiceMock
            .Setup(s => s.GetQuestionsAsync())
            .ReturnsAsync(questions);

        // Act
        var result = await _controller.GetQuestions();

        // Assert
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(200);

        var response = objectResult.Value
            .Should().BeAssignableTo<ResponseViewModel<IEnumerable<AnamnesisQuestionDto>>>().Subject;
        response.Status.Should().Be(200);
        response.Data.Should().HaveCount(2);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_Returns200_WhenServiceSucceeds()
    {
        // Arrange
        var clientId      = Guid.NewGuid();
        var professionalId = Guid.NewGuid();

        var createDto = new CreateAnamnesisSheetDto(
            ClientId         : clientId,
            ProfessionalId   : professionalId,
            Date             : DateTimeOffset.UtcNow,
            Diagnosis        : "Normal scalp",
            TreatmentProtocol: "Hydration protocol",
            Responses        : [],
            Evidences        : null,
            Signatures       : []
        );

        var sheetDto = new AnamnesisSheetDto(
            Id               : Guid.NewGuid(),
            ClientId         : clientId,
            ProfessionalId   : professionalId,
            ProfessionalName : "Dr. Jane",
            Date             : createDto.Date,
            Diagnosis        : createDto.Diagnosis,
            TreatmentProtocol: createDto.TreatmentProtocol,
            Status           : AnamnesisSheetStatus.Completed,
            Responses        : [],
            Evidences        : [],
            Signatures       : [],
            CreatedAt        : DateTimeOffset.UtcNow
        );

        _anamnesisServiceMock
            .Setup(s => s.CreateAnamnesisAsync(createDto))
            .ReturnsAsync(sheetDto);

        // Act
        var result = await _controller.Create(createDto);

        // Assert
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(200);

        var response = objectResult.Value
            .Should().BeAssignableTo<ResponseViewModel<AnamnesisSheetDto>>().Subject;
        response.Status.Should().Be(200);
        response.Data.Should().Be(sheetDto);
        response.Message.Should().Be("Anamnesis created successfully.");
    }

    [Fact]
    public async Task Create_Returns500WithFailResponse_WhenServiceThrowsException()
    {
        // Arrange — the controller catches ALL exceptions internally and returns ResponseViewModel.Fail
        // so the action never throws; it always returns an ObjectResult with status 500.
        var createDto = new CreateAnamnesisSheetDto(
            ClientId         : Guid.NewGuid(),
            ProfessionalId   : Guid.NewGuid(),
            Date             : DateTimeOffset.UtcNow,
            Diagnosis        : null,
            TreatmentProtocol: null,
            Responses        : [],
            Evidences        : null,
            Signatures       : []
        );

        _anamnesisServiceMock
            .Setup(s => s.CreateAnamnesisAsync(createDto))
            .ThrowsAsync(new Exception("Database error."));

        // Act
        var result = await _controller.Create(createDto);

        // Assert — controller wraps exception in ResponseViewModel.Fail (status 500), never propagates
        var objectResult = result.Should().BeAssignableTo<ObjectResult>().Subject;
        objectResult.StatusCode.Should().NotBe(200);

        var response = objectResult.Value.Should().BeAssignableTo<ResponseViewModel<object>>().Subject;
        response.Status.Should().Be(500);
        response.Message.Should().Contain("Database error.");
    }
}
