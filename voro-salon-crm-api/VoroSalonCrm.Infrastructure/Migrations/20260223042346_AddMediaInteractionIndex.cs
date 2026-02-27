using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSwipeEntertainment.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaInteractionIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserMediaInteractions_UserId_MediaItemId",
                table: "UserMediaInteractions");

            migrationBuilder.CreateIndex(
                name: "IX_UserMediaInteractions_UserId_MediaItemId",
                table: "UserMediaInteractions",
                columns: new[] { "UserId", "MediaItemId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserMediaInteractions_UserId_MediaItemId",
                table: "UserMediaInteractions");

            migrationBuilder.CreateIndex(
                name: "IX_UserMediaInteractions_UserId_MediaItemId",
                table: "UserMediaInteractions",
                columns: new[] { "UserId", "MediaItemId" });
        }
    }
}
