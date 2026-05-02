using Moq;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Integration;
using Microsoft.Extensions.Logging.Abstractions;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionResponseServiceTests
{
    private static TenantEvolutionInstance MakeInstance(Guid tenantId) => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        InstanceId = "instance-001",
        InstanceToken = "token-abc",
        Status = EvolutionInstanceStatus.Connected
    };

    private static WhatsAppMessage MakeInboundMsg(Guid tenantId, string body = "oi") => new()
    {
        Id = Guid.NewGuid(),
        TenantId = tenantId,
        Direction = "inbound",
        From = "5511999990000",
        To = "instance-001",
        Body = body,
        Timestamp = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task ProcessAsync_SendsTemplateResponse_WhenRulesEngineMatches()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId, "oi tudo bem");
        var template = new EvolutionTemplate { Id = Guid.NewGuid(), Body = "Olá! Como posso ajudar?" };

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(MakeInstance(tenantId));

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        rulesEngine.Setup(r => r.MatchAsync(msg.Body, It.IsAny<CancellationToken>()))
            .ReturnsAsync(template);

        var templateService = new Mock<IEvolutionTemplateService>();
        templateService.Setup(s => s.RenderAsync(template.Id, Array.Empty<string>()))
            .ReturnsAsync("Olá! Como posso ajudar?");

        var aiResponder = new Mock<IEvolutionAIResponder>();
        var evolutionService = new Mock<IEvolutionService>();
        evolutionService.Setup(s => s.SendTextAsync("instance-001", msg.From, "Olá! Como posso ajudar?", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        aiResponder.Verify(a => a.RespondAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        whatsAppMsgService.Verify(s => s.SaveOutboundAsync(tenantId, "instance-001", msg.From, "Olá! Como posso ajudar?", null), Times.Once);
        Assert.NotNull(msg.ProcessedByBotAt);
    }

    [Fact]
    public async Task ProcessAsync_CallsAIResponder_WhenNoRuleMatch()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId, "quero agendar");

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(MakeInstance(tenantId));

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        rulesEngine.Setup(r => r.MatchAsync(msg.Body, It.IsAny<CancellationToken>()))
            .ReturnsAsync((EvolutionTemplate?)null);

        var aiResponder = new Mock<IEvolutionAIResponder>();
        aiResponder.Setup(a => a.RespondAsync(tenantId, msg.From, msg.Body, It.IsAny<CancellationToken>()))
            .ReturnsAsync("Claro! Qual serviço você deseja?");

        var templateService = new Mock<IEvolutionTemplateService>();
        var evolutionService = new Mock<IEvolutionService>();
        evolutionService.Setup(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        templateService.Verify(s => s.RenderAsync(It.IsAny<Guid>(), It.IsAny<string[]>()), Times.Never);
        whatsAppMsgService.Verify(s => s.SaveOutboundAsync(tenantId, "instance-001", msg.From, "Claro! Qual serviço você deseja?", null), Times.Once);
        Assert.NotNull(msg.ProcessedByBotAt);
    }

    [Fact]
    public async Task ProcessAsync_SetsProcessedByBotAt_EvenWhenBodyIsEmpty()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId, body: "");

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(MakeInstance(tenantId));

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        var templateService = new Mock<IEvolutionTemplateService>();
        var aiResponder = new Mock<IEvolutionAIResponder>();
        var evolutionService = new Mock<IEvolutionService>();
        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        evolutionService.Verify(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        Assert.NotNull(msg.ProcessedByBotAt);
    }

    [Fact]
    public async Task ProcessAsync_DoesNotSendResponse_WhenInstanceIsDisconnected()
    {
        var tenantId = Guid.NewGuid();
        var msg = MakeInboundMsg(tenantId);

        var disconnectedInstance = new TenantEvolutionInstance
        {
            TenantId = tenantId,
            InstanceId = "inst",
            Status = EvolutionInstanceStatus.Disconnected
        };

        var instanceRepo = new Mock<ITenantEvolutionInstanceRepository>();
        instanceRepo.Setup(r => r.GetByTenantIdAsync(tenantId))
            .ReturnsAsync(disconnectedInstance);

        var rulesEngine = new Mock<IEvolutionRulesEngine>();
        var templateService = new Mock<IEvolutionTemplateService>();
        var aiResponder = new Mock<IEvolutionAIResponder>();
        var evolutionService = new Mock<IEvolutionService>();
        var whatsAppMsgService = new Mock<IWhatsAppMessageService>();

        var service = new EvolutionResponseService(
            instanceRepo.Object, rulesEngine.Object, templateService.Object,
            aiResponder.Object, evolutionService.Object, whatsAppMsgService.Object,
            NullLogger<EvolutionResponseService>.Instance);

        await service.ProcessAsync(msg);

        evolutionService.Verify(s => s.SendTextAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
