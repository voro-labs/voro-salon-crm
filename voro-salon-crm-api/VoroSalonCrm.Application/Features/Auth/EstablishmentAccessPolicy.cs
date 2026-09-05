using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Application.Features.Auth;

/// <summary>
/// Regras de acesso por domínio de estabelecimento (salão, barbearia, petshop...).
/// <para>
/// Uma mesma conta pode ter estabelecimentos de tipos diferentes. O domínio usado no
/// login não define <b>qual</b> estabelecimento é o principal da conta: ele apenas
/// filtra quais estabelecimentos podem ser usados naquela sessão. Por isso a validação
/// olha <b>todos</b> os tenants do usuário, e não só o padrão (issue de login
/// multi-estabelecimento).
/// </para>
/// </summary>
public static class EstablishmentAccessPolicy
{
    /// <summary>
    /// Vínculos do usuário cujo estabelecimento pertence ao tipo informado.
    /// Vazio quando o tipo não foi informado (cliente sem domínio, como o app mobile).
    /// </summary>
    public static IReadOnlyList<UserTenant> TenantsOfType(User user, int? establishmentType)
    {
        if (!establishmentType.HasValue)
            return [];

        return user.UserTenants?
            .Where(ut => ut.Tenant != null && (int)ut.Tenant.EstablishmentType == establishmentType.Value)
            .ToList() ?? [];
    }

    /// <summary>
    /// Indica se o usuário pode entrar por um domínio desse tipo — basta ter
    /// <b>pelo menos um</b> estabelecimento do tipo. Quando o tipo não é informado, ou
    /// quando não há nenhum estabelecimento carregado, nada é validado.
    /// </summary>
    public static bool HasAccessTo(User user, int? establishmentType)
    {
        if (!establishmentType.HasValue)
            return true;

        var known = user.UserTenants?.Where(ut => ut.Tenant != null).ToList() ?? [];

        return known.Count == 0 || known.Any(ut => (int)ut.Tenant.EstablishmentType == establishmentType.Value);
    }

    /// <summary>
    /// Estabelecimento a ser conectado no login, priorizando os do tipo do domínio
    /// acessado. Dentro dos candidatos, mantém o último acessado; senão, o padrão.
    /// </summary>
    public static Guid? ResolveTenantId(User user, int? establishmentType, Guid? lastConnectedTenantId)
        => ResolveUserTenant(user, establishmentType, lastConnectedTenantId)?.TenantId;

    /// <summary>
    /// Mesmo critério de <see cref="ResolveTenantId"/>, devolvendo o estabelecimento em si
    /// (usado, por exemplo, para a marca aplicada nos e-mails do login).
    /// </summary>
    public static Tenant? ResolveTenant(User user, int? establishmentType, Guid? lastConnectedTenantId = null)
        => ResolveUserTenant(user, establishmentType, lastConnectedTenantId)?.Tenant;

    private static UserTenant? ResolveUserTenant(User user, int? establishmentType, Guid? lastConnectedTenantId)
    {
        var candidates = user.UserTenants?.ToList() ?? [];
        if (candidates.Count == 0)
            return null;

        var ofType = TenantsOfType(user, establishmentType);
        if (ofType.Count > 0)
            candidates = [.. ofType];

        if (lastConnectedTenantId.HasValue)
        {
            var lastConnected = candidates.FirstOrDefault(ut => ut.TenantId == lastConnectedTenantId.Value);
            if (lastConnected != null)
                return lastConnected;
        }

        return candidates.FirstOrDefault(ut => ut.IsDefault) ?? candidates[0];
    }
}
