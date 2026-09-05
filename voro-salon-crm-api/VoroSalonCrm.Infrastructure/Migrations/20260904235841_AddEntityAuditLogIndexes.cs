using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <summary>
    /// Índices para <c>EntityAuditLogs</c> (issue #117).
    /// <para>
    /// Criados com <c>CONCURRENTLY</c> em vez do <c>CreateIndex</c> que o EF gerou, pelo mesmo
    /// motivo da migration de <c>RouteAuditLogs</c>: o <c>release_command</c> roda antes da nova
    /// versão subir, e a versão antiga ainda grava uma linha por entidade alterada dentro do
    /// request. Um <c>CREATE INDEX</c> comum toma lock de escrita e travaria essas gravações
    /// durante toda a construção do índice, numa tabela que nunca teve expurgo.
    /// </para>
    /// <para>
    /// <c>CONCURRENTLY</c> não pode rodar dentro de transação, daí o
    /// <c>suppressTransaction: true</c>. Se uma execução falhar no meio, o Postgres deixa um
    /// índice INVALID para trás — o bloco de limpeza abaixo derruba esses restos, porque o
    /// <c>IF NOT EXISTS</c> sozinho enxergaria o índice quebrado e não o reconstruiria.
    /// </para>
    /// </summary>
    public partial class AddEntityAuditLogIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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
                          AND c.relname IN ('IX_EntityAuditLogs_Timestamp',
                                            'IX_EntityAuditLogs_TenantId_Timestamp',
                                            'IX_EntityAuditLogs_EntityName_PrimaryKey')
                    LOOP
                        EXECUTE format('DROP INDEX IF EXISTS %I', idx);
                    END LOOP;
                END $$;
                """,
                suppressTransaction: true);

            // Atende o expurgo por retenção (EntityAuditRetentionJob).
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_EntityAuditLogs_Timestamp"
                ON "EntityAuditLogs" ("Timestamp");
                """,
                suppressTransaction: true);

            // Atende consulta de auditoria por estabelecimento, do mais recente para o mais antigo.
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_EntityAuditLogs_TenantId_Timestamp"
                ON "EntityAuditLogs" ("TenantId", "Timestamp" DESC);
                """,
                suppressTransaction: true);

            // Atende "o que aconteceu com este registro", que é como um log de entidade é lido.
            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_EntityAuditLogs_EntityName_PrimaryKey"
                ON "EntityAuditLogs" ("EntityName", "PrimaryKey");
                """,
                suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_EntityAuditLogs_EntityName_PrimaryKey";
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_EntityAuditLogs_TenantId_Timestamp";
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                DROP INDEX CONCURRENTLY IF EXISTS "IX_EntityAuditLogs_Timestamp";
                """,
                suppressTransaction: true);
        }
    }
}
