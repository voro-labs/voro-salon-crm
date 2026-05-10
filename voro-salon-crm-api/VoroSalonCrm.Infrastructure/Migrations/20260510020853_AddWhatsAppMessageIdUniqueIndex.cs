using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppMessageIdUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remove duplicatas mantendo apenas o registro mais antigo por WhatsAppMessageId
            migrationBuilder.Sql(@"
                DELETE FROM ""WhatsAppMessages""
                WHERE ""Id"" IN (
                    SELECT ""Id"" FROM (
                        SELECT ""Id"",
                               ROW_NUMBER() OVER (
                                   PARTITION BY ""WhatsAppMessageId""
                                   ORDER BY ""Timestamp"" ASC
                               ) AS rn
                        FROM ""WhatsAppMessages""
                        WHERE ""WhatsAppMessageId"" IS NOT NULL
                    ) sub
                    WHERE rn > 1
                );
            ");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppMessages_WhatsAppMessageId",
                table: "WhatsAppMessages",
                column: "WhatsAppMessageId",
                unique: true,
                filter: "\"WhatsAppMessageId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WhatsAppMessages_WhatsAppMessageId",
                table: "WhatsAppMessages");
        }
    }
}
