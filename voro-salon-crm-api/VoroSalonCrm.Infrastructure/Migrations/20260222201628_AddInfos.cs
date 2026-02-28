using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInfos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserEraScores_Genres_GenreId",
                table: "UserEraScores");

            migrationBuilder.DropIndex(
                name: "IX_UserEraScores_GenreId",
                table: "UserEraScores");

            migrationBuilder.DropIndex(
                name: "IX_UserEraScores_UserId",
                table: "UserEraScores");

            migrationBuilder.DropColumn(
                name: "GenreId",
                table: "UserEraScores");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "UserEraScores",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAt",
                table: "UserEraScores",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Era",
                table: "UserEraScores",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "UserEraScores",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_UserEraScores_UserId_Era",
                table: "UserEraScores",
                columns: new[] { "UserId", "Era" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserEraScores_UserId_Era",
                table: "UserEraScores");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "UserEraScores");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "UserEraScores");

            migrationBuilder.DropColumn(
                name: "Era",
                table: "UserEraScores");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "UserEraScores");

            migrationBuilder.AddColumn<Guid>(
                name: "GenreId",
                table: "UserEraScores",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_UserEraScores_GenreId",
                table: "UserEraScores",
                column: "GenreId");

            migrationBuilder.CreateIndex(
                name: "IX_UserEraScores_UserId",
                table: "UserEraScores",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserEraScores_Genres_GenreId",
                table: "UserEraScores",
                column: "GenreId",
                principalTable: "Genres",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
