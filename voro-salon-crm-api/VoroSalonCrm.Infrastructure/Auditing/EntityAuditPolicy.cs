using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Infrastructure.Auditing
{
    /// <summary>
    /// Define o que entra no <c>EntityAuditLog</c>.
    /// <para>
    /// Antes o log era opt-out: toda entidade alterada virava um INSERT extra com JSON em cada
    /// <c>SaveChanges</c> — inclusive sessão de funil de agendamento, mensagem de WhatsApp e
    /// token de push, que não têm valor de auditoria e são justamente as tabelas com mais
    /// escrita. Agora é opt-in: só o que está listado aqui vira log (issue #117).
    /// </para>
    /// </summary>
    public static class EntityAuditPolicy
    {
        /// <summary>
        /// Entidades com valor de auditoria: dinheiro, assinatura, prontuário, acesso e
        /// configuração do estabelecimento.
        /// <para>
        /// Mexer nesta lista muda o que passa a ser gravado daqui em diante; não reescreve o
        /// histórico já existente.
        /// </para>
        /// </summary>
        private static readonly HashSet<Type> Audited =
        [
            // Cadastro e operação
            typeof(Client),
            typeof(Appointment),
            typeof(Service),
            typeof(ServiceRecord),
            typeof(Employee),
            typeof(ServicePromotion),
            typeof(EmployeeGoal),

            // Dinheiro
            typeof(Transaction),
            typeof(TransactionCategory),
            typeof(ClientMembership),
            typeof(ClientMembershipPlan),

            // Assinatura do estabelecimento
            typeof(TenantSubscription),
            typeof(SubscriptionPlan),
            typeof(SubscriptionCoupon),
            typeof(PendingPlanChange),

            // Prontuário — o que justifica retenção mais longa
            typeof(AnamnesisSheet),
            typeof(AnamnesisResponse),
            typeof(AnamnesisSignature),

            // Acesso e configuração do estabelecimento
            typeof(User),
            typeof(UserTenant),
            typeof(Tenant),
            typeof(TenantModule)
        ];

        /// <summary>
        /// Propriedades cujo valor nunca deve ir para o log.
        /// <para>
        /// O log serializa o objeto inteiro, então sem esta lista o hash de senha do usuário, o
        /// refresh token e os tokens de integração acabavam gravados em texto num JSON sem
        /// índice, sem expurgo e que nenhuma tela lê. Comparação sem diferenciar maiúsculas, e
        /// por nome de propriedade — redigir demais num log de auditoria é barato, de menos não.
        /// </para>
        /// </summary>
        private static readonly HashSet<string> Redacted = new(StringComparer.OrdinalIgnoreCase)
        {
            "PasswordHash",
            "SecurityStamp",
            "ConcurrencyStamp",
            "RefreshToken",
            "TwoFactorPendingToken",
            "Token",
            "PublicToken",
            "InstanceToken",
            "WhatsAppAccessToken"
        };

        /// <summary>Marcador gravado no lugar do valor sensível.</summary>
        public const string RedactedValue = "[redacted]";

        public static bool IsAudited(Type entityType) => Audited.Contains(entityType);

        /// <summary>
        /// Devolve o valor que deve ser gravado no log: o original, ou o marcador quando a
        /// propriedade é sensível. Mantém <c>null</c> como <c>null</c>, para não inventar que
        /// um campo vazio tinha conteúdo.
        /// </summary>
        public static object? Sanitize(string propertyName, object? value)
        {
            if (value is null) return null;

            return Redacted.Contains(propertyName) ? RedactedValue : value;
        }
    }
}
