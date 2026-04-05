using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServicePromotionClientRatingAndAnamnesisPublicToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublicToken",
                table: "AnamnesisSheets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PublicTokenExpiresAt",
                table: "AnamnesisSheets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ClientRatings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Stars = table.Column<int>(type: "integer", nullable: false),
                    Comment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientRatings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientRatings_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClientRatings_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClientRatings_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ServicePromotions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    PromotionalPrice = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    DaysOfWeek = table.Column<int[]>(type: "integer[]", nullable: false),
                    ValidFrom = table.Column<DateOnly>(type: "date", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServicePromotions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ServicePromotions_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ServicePromotions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisSheets_PublicToken",
                table: "AnamnesisSheets",
                column: "PublicToken",
                unique: true,
                filter: "\"PublicToken\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ClientRatings_AppointmentId",
                table: "ClientRatings",
                column: "AppointmentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientRatings_ClientId",
                table: "ClientRatings",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientRatings_TenantId",
                table: "ClientRatings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicePromotions_ServiceId",
                table: "ServicePromotions",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicePromotions_TenantId",
                table: "ServicePromotions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ServicePromotions_TenantId_ServiceId",
                table: "ServicePromotions",
                columns: new[] { "TenantId", "ServiceId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientRatings");

            migrationBuilder.DropTable(
                name: "ServicePromotions");

            migrationBuilder.DropIndex(
                name: "IX_AnamnesisSheets_PublicToken",
                table: "AnamnesisSheets");

            migrationBuilder.DropColumn(
                name: "PublicToken",
                table: "AnamnesisSheets");

            migrationBuilder.DropColumn(
                name: "PublicTokenExpiresAt",
                table: "AnamnesisSheets");
        }
    }
}
