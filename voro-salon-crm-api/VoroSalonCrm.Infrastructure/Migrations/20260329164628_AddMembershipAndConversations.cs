using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMembershipAndConversations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastExpirationNoticeSentAt",
                table: "ClientMemberships",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ClientMembershipId",
                table: "Appointments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WhatsAppConversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    PhoneNumber = table.Column<string>(type: "text", nullable: false),
                    ContactName = table.Column<string>(type: "text", nullable: false),
                    State = table.Column<string>(type: "text", nullable: false),
                    LastMessageBody = table.Column<string>(type: "text", nullable: false),
                    AppointmentId = table.Column<Guid>(type: "uuid", nullable: true),
                    LastMessageAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WhatsAppConversations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WhatsAppConversations_Appointments_AppointmentId",
                        column: x => x.AppointmentId,
                        principalTable: "Appointments",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WhatsAppConversations_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ClientMembershipId",
                table: "Appointments",
                column: "ClientMembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppConversations_AppointmentId",
                table: "WhatsAppConversations",
                column: "AppointmentId");

            migrationBuilder.CreateIndex(
                name: "IX_WhatsAppConversations_TenantId",
                table: "WhatsAppConversations",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_ClientMemberships_ClientMembershipId",
                table: "Appointments",
                column: "ClientMembershipId",
                principalTable: "ClientMemberships",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_ClientMemberships_ClientMembershipId",
                table: "Appointments");

            migrationBuilder.DropTable(
                name: "WhatsAppConversations");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_ClientMembershipId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "LastExpirationNoticeSentAt",
                table: "ClientMemberships");

            migrationBuilder.DropColumn(
                name: "ClientMembershipId",
                table: "Appointments");
        }
    }
}
