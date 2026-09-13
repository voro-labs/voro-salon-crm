using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <summary>
    /// Índices para as consultas que os background jobs repetem em produção (issue #129).
    /// <para>
    /// Nenhuma das três tinha índice de apoio e todas rodavam em laço, então cada execução era
    /// um seq scan da tabela inteira. Somadas, mantinham o compute do Postgres ocupado o dia
    /// inteiro e estouravam o teto de compute hours do plano.
    /// </para>
    /// <para>
    /// Escritos à mão com <c>CONCURRENTLY</c>, pelo mesmo motivo das migrations #115: o
    /// <c>release_command</c> roda antes da versão nova subir, e um <c>CREATE INDEX</c> comum
    /// travaria escrita na tabela durante toda a construção, com a versão antiga ainda no ar.
    /// <c>CONCURRENTLY</c> não roda dentro de transação, daí o <c>suppressTransaction: true</c>.
    /// </para>
    /// </summary>
    public partial class AddBackgroundJobIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Limpa índices INVALID de uma tentativa anterior interrompida: o IF NOT EXISTS
            // enxerga o índice quebrado, não reconstrói, e a migration "passaria" deixando um
            // índice que o Postgres nunca usa.
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE idx text;
                BEGIN
                    FOR idx IN
                        SELECT c.relname
                        FROM pg_class c
                        JOIN pg_index i ON i.indexrelid = c.oid
                        WHERE NOT i.indisvalid
                          AND c.relname IN ('IX_WhatsAppMessages_PendingBot',
                                            'IX_TenantSubscriptions_PendingCheckout',
                                            'IX_TenantSubscriptions_TenantId_CreatedAt')
                    LOOP
                        EXECUTE format('DROP INDEX IF EXISTS %I', idx);
                    END LOOP;
                END $$;
                """,
                suppressTransaction: true);

            // EvolutionResponseWorker: mensagens inbound que o bot ainda não processou.
            //
            // Índice parcial, e não completo, porque o predicado é o que torna a consulta
            // barata: a tabela guarda todo o histórico de conversas, mas a fila de trabalho são
            // as poucas linhas ainda não processadas. A linha sai do índice quando o bot marca
            // ProcessedByBotAt, então ele se mantém pequeno sozinho, independente do tamanho
            // da tabela.
            //
            // Timestamp primeiro atende o ORDER BY do worker sem sort; TenantId em seguida
            // resolve o filtro por tenants conectados dentro do próprio índice.
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_WhatsAppMessages_PendingBot"
                ON "WhatsAppMessages" ("Timestamp", "TenantId")
                WHERE "ProcessedByBotAt" IS NULL AND "Direction" = 'inbound';
                """,
                suppressTransaction: true);

            // ExpiredCheckoutCleanupJob: checkouts pendentes vencidos.
            //
            // Status = 2 é SubscriptionStatus.Inactive. O valor vai literal porque predicado de
            // índice parcial precisa ser imutável — se a ordem do enum mudar, este índice tem
            // que ser refeito junto.
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_TenantSubscriptions_PendingCheckout"
                ON "TenantSubscriptions" ("CheckoutExpiresAt")
                WHERE "Status" = 2 AND "CheckoutExpiresAt" IS NOT NULL;
                """,
                suppressTransaction: true);

            // Assinatura vigente do tenant (middleware de acesso, /subscription/me e os fluxos
            // de troca de plano): filtra por TenantId e pega a mais recente. Só havia índice em
            // TenantId, então o "mais recente" custava um sort a cada consulta.
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_TenantSubscriptions_TenantId_CreatedAt"
                ON "TenantSubscriptions" ("TenantId", "CreatedAt" DESC);
                """,
                suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_TenantSubscriptions_TenantId_CreatedAt";
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_TenantSubscriptions_PendingCheckout";
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_WhatsAppMessages_PendingBot";
                """,
                suppressTransaction: true);
        }
    }
}
