using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAnamnesisQuestionPlaceholder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Placeholder",
                table: "AnamnesisQuestions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Placeholder",
                table: "AnamnesisQuestions");
        }
    }
}
