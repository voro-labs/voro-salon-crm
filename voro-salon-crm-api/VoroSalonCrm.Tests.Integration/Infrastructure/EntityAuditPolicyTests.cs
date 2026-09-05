using FluentAssertions;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Infrastructure.Auditing;

namespace VoroSalonCrm.Tests.Integration.Infrastructure;

/// <summary>
/// A política é o que decide o volume de escrita do EntityAuditLog e o que vai parar dentro do
/// JSON. As duas coisas eram problema em produção: auditava tudo, e gravava hash de senha e
/// token em texto (issue #117).
/// </summary>
public class EntityAuditPolicyTests
{
    [Theory]
    [InlineData(typeof(Client))]
    [InlineData(typeof(Appointment))]
    [InlineData(typeof(Transaction))]
    [InlineData(typeof(TenantSubscription))]
    [InlineData(typeof(AnamnesisSheet))]
    [InlineData(typeof(User))]
    public void Audits_TheEntitiesWithAuditValue(Type entityType)
        => EntityAuditPolicy.IsAudited(entityType).Should().BeTrue();

    [Theory]
    [InlineData(typeof(BookingFunnelSession))]
    [InlineData(typeof(WhatsAppMessage))]
    [InlineData(typeof(PushToken))]
    [InlineData(typeof(UserNotification))]
    [InlineData(typeof(AIConversationMessage))]
    [InlineData(typeof(UserExtension))]
    public void DoesNotAudit_TheHighVolumeNoise(Type entityType)
        => EntityAuditPolicy.IsAudited(entityType).Should().BeFalse();

    [Theory]
    [InlineData(typeof(EntityAuditLog))]
    [InlineData(typeof(RouteAuditLog))]
    [InlineData(typeof(IntegrationAuditLog))]
    public void DoesNotAudit_TheAuditLogsThemselves(Type entityType)
        => EntityAuditPolicy.IsAudited(entityType).Should().BeFalse();

    [Theory]
    [InlineData("PasswordHash")]
    [InlineData("SecurityStamp")]
    [InlineData("RefreshToken")]
    [InlineData("TwoFactorPendingToken")]
    [InlineData("WhatsAppAccessToken")]
    [InlineData("InstanceToken")]
    [InlineData("PublicToken")]
    [InlineData("Token")]
    public void Sanitize_RedactsSensitiveProperties(string propertyName)
        => EntityAuditPolicy.Sanitize(propertyName, "valor-secreto")
            .Should().Be(EntityAuditPolicy.RedactedValue);

    [Fact]
    public void Sanitize_IgnoresCasing()
        => EntityAuditPolicy.Sanitize("passwordhash", "valor-secreto")
            .Should().Be(EntityAuditPolicy.RedactedValue);

    [Fact]
    public void Sanitize_KeepsOrdinaryValues()
        => EntityAuditPolicy.Sanitize("Name", "Maria Souza").Should().Be("Maria Souza");

    [Fact]
    public void Sanitize_KeepsNullAsNull()
    {
        // Um campo vazio precisa continuar vazio no log: trocar null pelo marcador faria parecer
        // que havia conteúdo redigido onde não havia nada.
        EntityAuditPolicy.Sanitize("RefreshToken", null).Should().BeNull();
        EntityAuditPolicy.Sanitize("Name", null).Should().BeNull();
    }
}
