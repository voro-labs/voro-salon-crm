using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPixPaymentIdToTenantSubscription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MercadoPagoPixPaymentId",
                table: "TenantSubscriptions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TenantSubscriptions_MercadoPagoPixPaymentId",
                table: "TenantSubscriptions",
                column: "MercadoPagoPixPaymentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TenantSubscriptions_MercadoPagoPixPaymentId",
                table: "TenantSubscriptions");

            migrationBuilder.DropColumn(
                name: "MercadoPagoPixPaymentId",
                table: "TenantSubscriptions");
        }
    }
}
