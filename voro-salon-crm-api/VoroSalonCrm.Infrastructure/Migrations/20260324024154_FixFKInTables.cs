using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixFKInTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAt",
                table: "UserNotifications",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "UserNotifications",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_IntegrationAuditLogs_TenantId",
                table: "IntegrationAuditLogs",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_IntegrationAuditLogs_Tenants_TenantId",
                table: "IntegrationAuditLogs",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserNotifications_Users_UserId",
                table: "UserNotifications",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IntegrationAuditLogs_Tenants_TenantId",
                table: "IntegrationAuditLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_UserNotifications_Users_UserId",
                table: "UserNotifications");

            migrationBuilder.DropIndex(
                name: "IX_IntegrationAuditLogs_TenantId",
                table: "IntegrationAuditLogs");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "UserNotifications");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "UserNotifications");
        }
    }
}
