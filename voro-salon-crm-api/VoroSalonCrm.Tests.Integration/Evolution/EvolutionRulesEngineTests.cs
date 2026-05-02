using Microsoft.Extensions.Caching.Memory;
using Moq;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Integration;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionRulesEngineTests
{
    private static IMemoryCache CreateCache() =>
        new MemoryCache(new MemoryCacheOptions());

    private static EvolutionTemplate MakeTemplate(string keywords, DateTimeOffset createdAt) => new()
    {
        Id = Guid.NewGuid(),
        Name = "test",
        Label = "Test",
        Body = "Olá!",
        IsActive = true,
        Keywords = keywords,
        CreatedAt = createdAt
    };

    [Fact]
    public async Task MatchAsync_ReturnsTemplate_WhenBodyContainsKeyword()
    {
        var template = MakeTemplate("[\"oi\",\"olá\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("Oi, tudo bem?");

        Assert.NotNull(result);
        Assert.Equal(template.Id, result.Id);
    }

    [Fact]
    public async Task MatchAsync_ReturnsNull_WhenNoKeywordMatches()
    {
        var template = MakeTemplate("[\"oi\",\"olá\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("Quero agendar um horário");

        Assert.Null(result);
    }

    [Fact]
    public async Task MatchAsync_IsCaseInsensitive()
    {
        var template = MakeTemplate("[\"bom dia\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("BOM DIA! Como posso ajudar?");

        Assert.NotNull(result);
    }

    [Fact]
    public async Task MatchAsync_ReturnsFirstByCreatedAt_WhenMultipleMatch()
    {
        var older = MakeTemplate("[\"oi\"]", DateTimeOffset.UtcNow.AddDays(-2));
        var newer = MakeTemplate("[\"oi\"]", DateTimeOffset.UtcNow.AddDays(-1));
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { newer, older }); // intentionally unordered

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        var result = await engine.MatchAsync("oi");

        Assert.Equal(older.Id, result!.Id);
    }

    [Fact]
    public async Task MatchAsync_UsesCache_AndDoesNotCallRepoTwice()
    {
        var template = MakeTemplate("[\"oi\"]", DateTimeOffset.UtcNow);
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate> { template });

        var engine = new EvolutionRulesEngine(repo.Object, CreateCache());

        await engine.MatchAsync("oi");
        await engine.MatchAsync("oi");

        repo.Verify(r => r.GetAllAsync(
            It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
            It.IsAny<bool>(),
            It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()),
            Times.Once);
    }
}
