using Moq;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Integration;

namespace VoroSalonCrm.Tests.Integration.Evolution;

public class EvolutionAIResponderTests
{
    private static Tenant MakeTenant(Guid id, string name) => new()
    {
        Id = id,
        Name = name,
        Slug = "slug"
    };

    private static Mock<IEvolutionTemplateRepository> EmptyTemplateRepo()
    {
        var repo = new Mock<IEvolutionTemplateRepository>();
        repo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<EvolutionTemplate, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<EvolutionTemplate>, IQueryable<EvolutionTemplate>>[]>()))
            .ReturnsAsync(new List<EvolutionTemplate>());
        return repo;
    }

    [Fact]
    public async Task RespondAsync_CallsRespondWithContextAsync_WithTenantNameInPrompt()
    {
        var tenantId = Guid.NewGuid();
        var from = "5511999990000";
        var body = "Quero agendar";

        var tenantService = new Mock<ITenantService>();
        tenantService.Setup(s => s.GetByIdAsync(tenantId))
            .ReturnsAsync(MakeTenant(tenantId, "Salão Voro"));

        var serviceRepo = new Mock<IServiceRepository>();
        serviceRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Service, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Service>, IQueryable<Service>>[]>()))
            .ReturnsAsync(new List<Service>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Corte", Price = 60m }
            });

        var appointmentRepo = new Mock<IAppointmentRepository>();
        appointmentRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(new List<Appointment>());

        string? capturedPrompt = null;
        var aiService = new Mock<IAIConversationService>();
        aiService.Setup(s => s.RespondWithContextAsync(tenantId, from, It.IsAny<string>(), body))
            .Callback<Guid, string, string, string>((_, _, prompt, _) => capturedPrompt = prompt)
            .ReturnsAsync("Olá! Posso ajudar.");

        var responder = new EvolutionAIResponder(
            tenantService.Object, serviceRepo.Object, appointmentRepo.Object,
            EmptyTemplateRepo().Object, aiService.Object);

        var result = await responder.RespondAsync(tenantId, from, body);

        Assert.Equal("Olá! Posso ajudar.", result);
        Assert.Contains("Salão Voro", capturedPrompt);
        Assert.Contains("Corte", capturedPrompt);
        Assert.Contains("R$60", capturedPrompt);
    }

    [Fact]
    public async Task RespondAsync_IncludesAppointmentInfo_WhenClientHasActiveAppointment()
    {
        var tenantId = Guid.NewGuid();
        var from = "5511999990000";

        var tenantService = new Mock<ITenantService>();
        tenantService.Setup(s => s.GetByIdAsync(tenantId))
            .ReturnsAsync(MakeTenant(tenantId, "Salão"));

        var serviceRepo = new Mock<IServiceRepository>();
        serviceRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Service, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Service>, IQueryable<Service>>[]>()))
            .ReturnsAsync(new List<Service>());

        var scheduledAt = new DateTimeOffset(2026, 5, 10, 14, 30, 0, TimeSpan.Zero);
        var appointment = new Appointment
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ScheduledDateTime = scheduledAt,
            Status = AppointmentStatus.Confirmed,
            Client = new Client { Phone = from },
            Service = new Service { Name = "Coloração" }
        };

        var appointmentRepo = new Mock<IAppointmentRepository>();
        appointmentRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(new List<Appointment> { appointment });

        string? capturedPrompt = null;
        var aiService = new Mock<IAIConversationService>();
        aiService.Setup(s => s.RespondWithContextAsync(tenantId, from, It.IsAny<string>(), It.IsAny<string>()))
            .Callback<Guid, string, string, string>((_, _, prompt, _) => capturedPrompt = prompt)
            .ReturnsAsync("Ok!");

        var responder = new EvolutionAIResponder(
            tenantService.Object, serviceRepo.Object, appointmentRepo.Object,
            EmptyTemplateRepo().Object, aiService.Object);

        await responder.RespondAsync(tenantId, from, "oi");

        Assert.Contains("Coloração", capturedPrompt);
        Assert.Contains("10/05/2026", capturedPrompt);
    }

    [Fact]
    public async Task RespondAsync_ShowsNenhumAgendamento_WhenNoActiveAppointments()
    {
        var tenantId = Guid.NewGuid();
        var from = "5511999990000";

        var tenantService = new Mock<ITenantService>();
        tenantService.Setup(s => s.GetByIdAsync(tenantId))
            .ReturnsAsync(MakeTenant(tenantId, "Salão"));

        var serviceRepo = new Mock<IServiceRepository>();
        serviceRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Service, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Service>, IQueryable<Service>>[]>()))
            .ReturnsAsync(new List<Service>());

        var appointmentRepo = new Mock<IAppointmentRepository>();
        appointmentRepo.Setup(r => r.GetAllAsync(
                It.IsAny<System.Linq.Expressions.Expression<Func<Appointment, bool>>>(),
                It.IsAny<bool>(),
                It.IsAny<Func<IQueryable<Appointment>, IQueryable<Appointment>>[]>()))
            .ReturnsAsync(new List<Appointment>());

        string? capturedPrompt = null;
        var aiService = new Mock<IAIConversationService>();
        aiService.Setup(s => s.RespondWithContextAsync(tenantId, from, It.IsAny<string>(), It.IsAny<string>()))
            .Callback<Guid, string, string, string>((_, _, prompt, _) => capturedPrompt = prompt)
            .ReturnsAsync("Ok!");

        var responder = new EvolutionAIResponder(
            tenantService.Object, serviceRepo.Object, appointmentRepo.Object,
            EmptyTemplateRepo().Object, aiService.Object);

        await responder.RespondAsync(tenantId, from, "oi");

        Assert.Contains("nenhum agendamento ativo", capturedPrompt);
    }
}
