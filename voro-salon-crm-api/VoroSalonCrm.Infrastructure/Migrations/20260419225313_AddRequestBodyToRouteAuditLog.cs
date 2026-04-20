using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestBodyToRouteAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RequestBody",
                table: "RouteAuditLogs",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequestBody",
                table: "RouteAuditLogs");
        }
    }
}
