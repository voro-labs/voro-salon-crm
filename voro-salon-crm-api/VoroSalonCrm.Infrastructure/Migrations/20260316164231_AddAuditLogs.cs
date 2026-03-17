using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EntityAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntityName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    OldValues = table.Column<string>(type: "text", nullable: true),
                    NewValues = table.Column<string>(type: "text", nullable: true),
                    PrimaryKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EntityAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IntegrationAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IntegrationName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Endpoint = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    RequestPayload = table.Column<string>(type: "text", nullable: true),
                    ResponsePayload = table.Column<string>(type: "text", nullable: true),
                    StatusCode = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IntegrationAuditLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RouteAuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Method = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Path = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    QueryString = table.Column<string>(type: "text", nullable: true),
                    StatusCode = table.Column<int>(type: "integer", nullable: false),
                    IPAddress = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    DurationMs = table.Column<long>(type: "bigint", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteAuditLogs", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EntityAuditLogs");

            migrationBuilder.DropTable(
                name: "IntegrationAuditLogs");

            migrationBuilder.DropTable(
                name: "RouteAuditLogs");
        }
    }
}
