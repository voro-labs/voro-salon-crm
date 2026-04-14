using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPendingPlanChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PendingPlanChanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    CurrentPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubscriptionSnapshot = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    RequestedPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PendingPlanChanges", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PendingPlanChanges_ExpiresAt",
                table: "PendingPlanChanges",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_PendingPlanChanges_TenantId",
                table: "PendingPlanChanges",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PendingPlanChanges");
        }
    }
}
