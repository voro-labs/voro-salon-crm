using FluentAssertions;
using VoroSalonCrm.Application.Features.Auth;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Tests.Integration.Auth;

public class EstablishmentAccessPolicyTests
{
    private static UserTenant Link(EstablishmentType type, bool isDefault = false, Guid? tenantId = null)
    {
        var id = tenantId ?? Guid.NewGuid();
        return new UserTenant
        {
            TenantId  = id,
            IsDefault = isDefault,
            Tenant    = new Tenant { Id = id, EstablishmentType = type }
        };
    }

    private static User UserWith(params UserTenant[] tenants) => new()
    {
        Id          = Guid.NewGuid(),
        Email       = "user@voro.com",
        UserTenants = [.. tenants]
    };

    // ── HasAccessTo ───────────────────────────────────────────────────────────

    [Fact]
    public void HasAccessTo_AllowsWhenAnyTenantMatchesTheDomain()
    {
        // Conta com salão (padrão) + barbearia acessando o domínio da barbearia
        var user = UserWith(
            Link(EstablishmentType.Salon, isDefault: true),
            Link(EstablishmentType.Barber));

        EstablishmentAccessPolicy.HasAccessTo(user, (int)EstablishmentType.Barber).Should().BeTrue();
        EstablishmentAccessPolicy.HasAccessTo(user, (int)EstablishmentType.Salon).Should().BeTrue();
    }

    [Fact]
    public void HasAccessTo_DeniesWhenNoTenantMatchesTheDomain()
    {
        var user = UserWith(
            Link(EstablishmentType.Salon, isDefault: true),
            Link(EstablishmentType.Barber));

        EstablishmentAccessPolicy.HasAccessTo(user, (int)EstablishmentType.Petshop).Should().BeFalse();
    }

    [Fact]
    public void HasAccessTo_AllowsWhenDomainDoesNotRequireAType()
    {
        var user = UserWith(Link(EstablishmentType.Barber, isDefault: true));

        EstablishmentAccessPolicy.HasAccessTo(user, null).Should().BeTrue();
    }

    [Fact]
    public void HasAccessTo_AllowsWhenUserHasNoTenantYet()
    {
        var user = UserWith();

        EstablishmentAccessPolicy.HasAccessTo(user, (int)EstablishmentType.Salon).Should().BeTrue();
    }

    // ── ResolveTenantId ───────────────────────────────────────────────────────

    [Fact]
    public void ResolveTenantId_PicksTheTenantOfTheDomainType()
    {
        var salon  = Link(EstablishmentType.Salon, isDefault: true);
        var barber = Link(EstablishmentType.Barber);
        var user   = UserWith(salon, barber);

        EstablishmentAccessPolicy
            .ResolveTenantId(user, (int)EstablishmentType.Barber, lastConnectedTenantId: null)
            .Should().Be(barber.TenantId);
    }

    [Fact]
    public void ResolveTenantId_IgnoresLastConnectedTenantOfAnotherType()
    {
        // Último acesso foi no salão, mas agora o login veio pelo domínio da barbearia
        var salon  = Link(EstablishmentType.Salon, isDefault: true);
        var barber = Link(EstablishmentType.Barber);
        var user   = UserWith(salon, barber);

        EstablishmentAccessPolicy
            .ResolveTenantId(user, (int)EstablishmentType.Barber, lastConnectedTenantId: salon.TenantId)
            .Should().Be(barber.TenantId);
    }

    [Fact]
    public void ResolveTenantId_KeepsLastConnectedTenantWhenItMatchesTheDomain()
    {
        var barberA = Link(EstablishmentType.Barber, isDefault: true);
        var barberB = Link(EstablishmentType.Barber);
        var user    = UserWith(barberA, barberB);

        EstablishmentAccessPolicy
            .ResolveTenantId(user, (int)EstablishmentType.Barber, lastConnectedTenantId: barberB.TenantId)
            .Should().Be(barberB.TenantId);
    }

    [Fact]
    public void ResolveTenantId_FallsBackToDefaultTenantWhenDomainIsNotInformed()
    {
        var salon  = Link(EstablishmentType.Salon, isDefault: true);
        var barber = Link(EstablishmentType.Barber);
        var user   = UserWith(barber, salon);

        EstablishmentAccessPolicy
            .ResolveTenantId(user, null, lastConnectedTenantId: null)
            .Should().Be(salon.TenantId);
    }

    [Fact]
    public void ResolveTenantId_ReturnsNullWhenUserHasNoTenant()
    {
        EstablishmentAccessPolicy
            .ResolveTenantId(UserWith(), (int)EstablishmentType.Salon, lastConnectedTenantId: null)
            .Should().BeNull();
    }

    // ── VisibleTenants ────────────────────────────────────────────────────────

    [Fact]
    public void VisibleTenants_KeepsOnlyTheEstablishmentsOfTheDomain()
    {
        var salon   = Link(EstablishmentType.Salon, isDefault: true);
        var barberA = Link(EstablishmentType.Barber);
        var barberB = Link(EstablishmentType.Barber);
        var user    = UserWith(salon, barberA, barberB);

        EstablishmentAccessPolicy
            .VisibleTenants(user, (int)EstablishmentType.Barber)
            .Select(ut => ut.TenantId)
            .Should().BeEquivalentTo([barberA.TenantId, barberB.TenantId]);
    }

    [Fact]
    public void VisibleTenants_ReturnsEveryTenantWhenDomainIsNotInformed()
    {
        var salon  = Link(EstablishmentType.Salon, isDefault: true);
        var barber = Link(EstablishmentType.Barber);
        var user   = UserWith(salon, barber);

        EstablishmentAccessPolicy
            .VisibleTenants(user, null)
            .Select(ut => ut.TenantId)
            .Should().BeEquivalentTo([salon.TenantId, barber.TenantId]);
    }

    [Fact]
    public void VisibleTenants_ReturnsEveryTenantWhenNoneMatchesTheDomain()
    {
        // Não há o que filtrar: quem não tem estabelecimento do tipo nem chega a logar
        var salon = Link(EstablishmentType.Salon, isDefault: true);
        var user  = UserWith(salon);

        EstablishmentAccessPolicy
            .VisibleTenants(user, (int)EstablishmentType.Petshop)
            .Select(ut => ut.TenantId)
            .Should().BeEquivalentTo([salon.TenantId]);
    }
}
