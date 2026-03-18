using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordSecurityFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordChangedAt",
                table: "UserExtensions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TwoFactorCode",
                table: "UserExtensions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TwoFactorCodeExpiry",
                table: "UserExtensions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TwoFactorPendingToken",
                table: "UserExtensions",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PasswordHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PasswordHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PasswordHistories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PasswordHistories_UserId",
                table: "PasswordHistories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordHistories_UserId_CreatedAt",
                table: "PasswordHistories",
                columns: new[] { "UserId", "CreatedAt" },
                descending: new[] { false, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PasswordHistories");

            migrationBuilder.DropColumn(
                name: "PasswordChangedAt",
                table: "UserExtensions");

            migrationBuilder.DropColumn(
                name: "TwoFactorCode",
                table: "UserExtensions");

            migrationBuilder.DropColumn(
                name: "TwoFactorCodeExpiry",
                table: "UserExtensions");

            migrationBuilder.DropColumn(
                name: "TwoFactorPendingToken",
                table: "UserExtensions");
        }
    }
}
