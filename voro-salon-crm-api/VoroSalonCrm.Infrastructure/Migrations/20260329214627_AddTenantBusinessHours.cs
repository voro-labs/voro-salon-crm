using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantBusinessHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TenantBusinessHours",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    DayOfWeek = table.Column<int>(type: "integer", nullable: false),
                    IsOpen = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    OpenTime = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false, defaultValue: "08:00"),
                    CloseTime = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false, defaultValue: "18:00")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantBusinessHours", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantBusinessHours_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantBusinessHours_TenantId",
                table: "TenantBusinessHours",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantBusinessHours_TenantId_DayOfWeek",
                table: "TenantBusinessHours",
                columns: new[] { "TenantId", "DayOfWeek" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TenantBusinessHours");
        }
    }
}
