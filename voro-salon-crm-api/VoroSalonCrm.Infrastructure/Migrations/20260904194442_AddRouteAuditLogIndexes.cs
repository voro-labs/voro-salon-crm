using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <summary>
    /// Índices para <c>RouteAuditLogs</c> (issue #115).
    /// <para>
    /// Criados com <c>CONCURRENTLY</c> de propósito. A tabela recebe uma linha por
    /// requisição HTTP e nunca teve rotina de expurgo, então pode estar muito grande.
    /// Um <c>CREATE INDEX</c> comum toma lock de escrita, e o release_command roda antes
    /// da nova versão subir — a versão antiga, que ainda grava auditoria de forma síncrona
    /// dentro do request, ficaria travada durante toda a construção do índice.
    /// </para>
    /// <para>
    /// <c>CONCURRENTLY</c> não pode rodar dentro de transação, daí o
    /// <c>suppressTransaction: true</c>. Se uma execução falhar no meio, o Postgres deixa
    /// um índice INVALID para trás: nesse caso, derrubar manualmente com
    /// <c>DROP INDEX</c> e rodar a migration de novo (o <c>IF NOT EXISTS</c> sozinho não
    /// reconstrói um índice inválido).
    /// </para>
    /// </summary>
    public partial class AddRouteAuditLogIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Limpa índices INVALID deixados por uma tentativa anterior que falhou no meio.
            // Sem isto, o IF NOT EXISTS abaixo enxerga o índice quebrado, não reconstrói, e a
            // migration "passa" deixando um índice que o Postgres não usa. Derrubar um índice
            // inválido é barato: ele não está em uso.
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
                          AND c.relname IN ('IX_RouteAuditLogs_Timestamp',
                                            'IX_RouteAuditLogs_TenantId_Timestamp')
                    LOOP
                        EXECUTE format('DROP INDEX IF EXISTS %I', idx);
                    END LOOP;
                END $$;
                """,
                suppressTransaction: true);

            // Atende o expurgo por retenção (RouteAuditRetentionJob).
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_RouteAuditLogs_Timestamp"
                ON "RouteAuditLogs" ("Timestamp");
                """,
                suppressTransaction: true);

            // Atende consulta de auditoria por estabelecimento, do mais recente para o mais antigo.
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_RouteAuditLogs_TenantId_Timestamp"
                ON "RouteAuditLogs" ("TenantId", "Timestamp" DESC);
                """,
                suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_RouteAuditLogs_TenantId_Timestamp";
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_RouteAuditLogs_Timestamp";
                """,
                suppressTransaction: true);
        }
    }
}
