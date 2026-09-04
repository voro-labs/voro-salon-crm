using VoroSalonCrm.Domain.Entities;

namespace VoroSalonCrm.Domain.Interfaces.Auditing
{
    /// <summary>
    /// Fila em memória para gravação assíncrona de <see cref="RouteAuditLog"/>.
    /// <para>
    /// Antes o <c>AuditMiddleware</c> fazia <c>SaveChangesAsync</c> dentro do pipeline,
    /// somando um round-trip ao Postgres em toda requisição HTTP (issue #115). Agora ele
    /// só enfileira, e um background service grava em lote fora do caminho da resposta.
    /// </para>
    /// </summary>
    public interface IRouteAuditQueue
    {
        /// <summary>
        /// Enfileira um log. Não bloqueia: se a fila estiver cheia o log é descartado e
        /// <c>false</c> é retornado — auditoria nunca deve degradar o tempo de resposta
        /// nem derrubar a requisição.
        /// </summary>
        bool TryEnqueue(RouteAuditLog log);
    }
}
