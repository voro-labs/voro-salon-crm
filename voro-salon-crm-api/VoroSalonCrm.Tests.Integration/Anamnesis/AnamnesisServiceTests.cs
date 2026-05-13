using System.Linq.Expressions;
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Anamnesis;

public class AnamnesisServiceTests
{
    // ── CreateQuestionAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task CreateQuestion_Throws_WhenTenantIdIsEmpty()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();
        ctx.CurrentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
        var svc = ctx.Build();

        var dto = new CreateAnamnesisQuestionDto(
            Label       : "Possui alergia?",
            Placeholder : null,
            FieldType   : AnamnesisFieldType.Boolean,
            Options     : null,
            Section     : AnamnesisSection.GeneralHealth,
            Order       : 1,
            IsRequired  : true);

        // Act
        var act = () => svc.CreateQuestionAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task CreateQuestion_PersistsQuestion_WithCorrectTenantId()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();
        AnamnesisQuestion? captured = null;

        ctx.QuestionRepo
            .Setup(r => r.AddAsync(It.IsAny<AnamnesisQuestion>()))
            .Callback<AnamnesisQuestion>(q => captured = q)
            .Returns(Task.CompletedTask);

        var svc = ctx.Build();

        var dto = new CreateAnamnesisQuestionDto(
            Label       : "Qual seu tipo de cabelo?",
            Placeholder : "Ex: liso, cacheado...",
            FieldType   : AnamnesisFieldType.ShortText,
            Options     : null,
            Section     : AnamnesisSection.HairHistory,
            Order       : 2,
            IsRequired  : false);

        // Act
        await svc.CreateQuestionAsync(dto);

        // Assert
        captured.Should().NotBeNull();
        captured!.TenantId.Should().Be(ctx.TenantId);
        captured.Text.Should().Be(dto.Label);
        ctx.UnitOfWork.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    // ── CreateAnamnesisAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task CreateAnamnesis_Throws_WhenTenantIdIsEmpty()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();
        ctx.CurrentUser.Setup(u => u.TenantId).Returns(Guid.Empty);
        var svc = ctx.Build();

        var dto = new CreateAnamnesisSheetDto(
            ClientId          : Guid.NewGuid(),
            ProfessionalId    : Guid.NewGuid(),
            Date              : DateTimeOffset.UtcNow,
            Diagnosis         : null,
            TreatmentProtocol : null,
            Responses         : [],
            Evidences         : null,
            Signatures        : []);

        // Act
        var act = () => svc.CreateAnamnesisAsync(dto);

        // Assert
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ── GetQuestionsAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetQuestions_ReturnsOrderedQuestions()
    {
        // Arrange
        var ctx = new AnamnesisServiceContext();

        var questions = new List<AnamnesisQuestion>
        {
            new()
            {
                Id        = Guid.NewGuid(),
                TenantId  = ctx.TenantId,
                Text      = "Pergunta B",
                Identifier= "PERGUNTA_B",
                Section   = AnamnesisSection.GeneralHealth,
                Order     = 2,
                FieldType = AnamnesisFieldType.ShortText,
                IsDeleted = false
            },
            new()
            {
                Id        = Guid.NewGuid(),
                TenantId  = ctx.TenantId,
                Text      = "Pergunta A",
                Identifier= "PERGUNTA_A",
                Section   = AnamnesisSection.GeneralHealth,
                Order     = 1,
                FieldType = AnamnesisFieldType.ShortText,
                IsDeleted = false
            }
        };

        ctx.QuestionRepo
            .Setup(r => r.GetAllAsync(
                It.IsAny<Expression<Func<AnamnesisQuestion, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<AnamnesisQuestion>, IQueryable<AnamnesisQuestion>>[]>()))
            .ReturnsAsync(questions);

        var svc = ctx.Build();

        // Act
        var result = (await svc.GetQuestionsAsync()).ToList();

        // Assert
        result.Should().HaveCount(2);
        result[0].Label.Should().Be("Pergunta A");
        result[1].Label.Should().Be("Pergunta B");
    }
}
