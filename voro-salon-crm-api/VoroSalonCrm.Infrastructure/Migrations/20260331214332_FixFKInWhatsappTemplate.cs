using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixFKInWhatsappTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WhatsAppTemplates_Tenants_TenantId",
                table: "WhatsAppTemplates");

            migrationBuilder.DropIndex(
                name: "IX_WhatsAppTemplates_TenantId",
                table: "WhatsAppTemplates");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppTemplates_TenantId",
                table: "WhatsAppTemplates",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_WhatsAppTemplates_Tenants_TenantId",
                table: "WhatsAppTemplates",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id");
        }
    }
}
