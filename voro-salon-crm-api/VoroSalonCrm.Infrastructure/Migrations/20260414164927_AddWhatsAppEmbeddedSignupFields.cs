using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWhatsAppEmbeddedSignupFields : Migration
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

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppAccessToken",
                table: "Tenants",
                type: "character varying(512)",
                maxLength: 512,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "WhatsAppConnected",
                table: "Tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppDisplayPhone",
                table: "Tenants",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "WhatsAppTokenExpiresAt",
                table: "Tenants",
                type: "timestamp with time zone",
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

            migrationBuilder.DropColumn(
                name: "WhatsAppAccessToken",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "WhatsAppConnected",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "WhatsAppDisplayPhone",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "WhatsAppTokenExpiresAt",
                table: "Tenants");
        }
    }
}
