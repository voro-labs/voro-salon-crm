using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIConversationMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PhoneNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIConversationMessages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AppointmentServices",
                columns: table => new
                {
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppointmentServices", x => new { x.AppointmentId, x.ServiceId });
                    table.ForeignKey(
                        name: "FK_AppointmentServices_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AppointmentServices_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_TenantId_EmployeeId_ScheduledAt",
                table: "Appointments",
                columns: new[] { "TenantId", "EmployeeId", "ScheduledDateTime" },
                unique: true,
                filter: "\"EmployeeId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversationMessages_CreatedAt",
                table: "AIConversationMessages",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AIConversationMessages_TenantId_PhoneNumber",
                table: "AIConversationMessages",
                columns: new[] { "TenantId", "PhoneNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentServices_AppointmentId",
                table: "AppointmentServices",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AppointmentServices_ServiceId",
                table: "AppointmentServices",
                column: "ServiceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIConversationMessages");

            migrationBuilder.DropTable(
                name: "AppointmentServices");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_TenantId_EmployeeId_ScheduledAt",
                table: "Appointments");
        }
    }
}
