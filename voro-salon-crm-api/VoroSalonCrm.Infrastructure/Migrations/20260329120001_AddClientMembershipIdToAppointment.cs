using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClientMembershipIdToAppointment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClientMembershipId",
                table: "Appointments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_ClientMembershipId",
                table: "Appointments",
                column: "ClientMembershipId");

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_ClientMemberships_ClientMembershipId",
                table: "Appointments",
                column: "ClientMembershipId",
                principalTable: "ClientMemberships",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_ClientMemberships_ClientMembershipId",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_ClientMembershipId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "ClientMembershipId",
                table: "Appointments");
        }
    }
}
