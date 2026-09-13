using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Domain.Projections
{
    /// <summary>
    /// O mínimo que o portão de acesso precisa saber sobre a assinatura vigente de um tenant.
    /// <para>
    /// Existe para o <c>SubscriptionAccessMiddleware</c> não carregar a entidade inteira com o
    /// plano incluído no cache miss (issue #129). Ele decide com dois campos, mas pagava por um
    /// <c>Include(Plan)</c> e pelo rastreamento da entidade no ChangeTracker.
    /// </para>
    /// <para>
    /// Ausência de assinatura continua sendo representada por <c>null</c>, e não por um campo
    /// aqui dentro: o middleware já trata "sem assinatura" como liberado, e essa decisão é dele.
    /// </para>
    /// </summary>
    public sealed class SubscriptionAccessSnapshot
    {
        public SubscriptionStatus Status { get; set; }

        public DateTimeOffset? TrialEndsAt { get; set; }
    }
}
