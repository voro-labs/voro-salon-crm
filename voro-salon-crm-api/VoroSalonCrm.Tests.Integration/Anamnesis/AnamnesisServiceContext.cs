using System.Linq.Expressions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.Anamnesis;

/// <summary>
/// Mounts all AnamnesisService dependencies with neutral defaults.
/// Each test creates a fresh context and overrides only what the scenario needs.
/// </summary>
internal sealed class AnamnesisServiceContext
{
    public readonly Guid TenantId = Guid.NewGuid();

    public Mock<IAnamnesisQuestionRepository> QuestionRepo    { get; } = new();
    public Mock<IAnamnesisSheetRepository>    SheetRepo       { get; } = new();
    public Mock<IClientRepository>            ClientRepo      { get; } = new();
    public Mock<IUnitOfWork>                  UnitOfWork      { get; } = new();
    public Mock<ICurrentUserService>          CurrentUser     { get; } = new();
    public Mock<IWhatsappService>             WhatsappService { get; } = new();
    public Mock<ITenantRepository>            TenantRepo      { get; } = new();
    public IConfiguration                     Configuration   { get; } = new ConfigurationBuilder().Build();
    public Mock<ILogger<AnamnesisService>>    Logger          { get; } = new();
    public Mock<IUserRepository>              UserRepo        { get; } = new();

    public AnamnesisServiceContext()
    {
        CurrentUser.Setup(u => u.TenantId).Returns(TenantId);
        CurrentUser.Setup(u => u.UserId).Returns(Guid.NewGuid());

        UnitOfWork
            .Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        WhatsappService
            .Setup(w => w.SendTemplateMessageAsync(
                It.IsAny<VoroSalonCrm.Application.DTOs.Integration.WhatsappTemplateMessageDto>(),
                It.IsAny<string?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Default: GetAllAsync returns empty list so no test NPEs on unused paths
        QuestionRepo
            .Setup(r => r.GetAllAsync(
                It.IsAny<Expression<Func<AnamnesisQuestion, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<AnamnesisQuestion>, IQueryable<AnamnesisQuestion>>[]>()))
            .ReturnsAsync(new List<AnamnesisQuestion>());

        SheetRepo
            .Setup(r => r.GetAllAsync(
                It.IsAny<Expression<Func<AnamnesisSheet, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<AnamnesisSheet>, IQueryable<AnamnesisSheet>>[]>()))
            .ReturnsAsync(new List<AnamnesisSheet>());
    }

    // ── queryable helpers ──────────────────────────────────────────────────────

    public static IQueryable<T> AsyncQueryable<T>(IEnumerable<T> source)
        => new TestAsyncEnumerable<T>(source);

    public void SetupQuestionQueryable(IEnumerable<AnamnesisQuestion> questions)
    {
        var q = AsyncQueryable(questions);
        QuestionRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<AnamnesisQuestion, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    public void SetupSheetQueryable(IEnumerable<AnamnesisSheet> sheets)
    {
        var q = AsyncQueryable(sheets);
        SheetRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<AnamnesisSheet, bool>>>(), It.IsAny<bool>()))
            .Returns(q);
    }

    // ── factory ───────────────────────────────────────────────────────────────

    public AnamnesisService Build() => new(
        QuestionRepo.Object,
        SheetRepo.Object,
        ClientRepo.Object,
        UnitOfWork.Object,
        CurrentUser.Object,
        WhatsappService.Object,
        TenantRepo.Object,
        Configuration,
        Logger.Object,
        UserRepo.Object);
}
