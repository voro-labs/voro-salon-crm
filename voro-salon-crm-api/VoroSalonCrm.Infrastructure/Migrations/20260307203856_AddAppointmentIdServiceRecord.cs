using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentIdServiceRecord : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AppointmentId",
                table: "ServiceRecords",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRecords_AppointmentId",
                table: "ServiceRecords",
                column: "AppointmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceRecords_Appointments_AppointmentId",
                table: "ServiceRecords",
                column: "AppointmentId",
                principalTable: "Appointments",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServiceRecords_Appointments_AppointmentId",
                table: "ServiceRecords");

            migrationBuilder.DropIndex(
                name: "IX_ServiceRecords_AppointmentId",
                table: "ServiceRecords");

            migrationBuilder.DropColumn(
                name: "AppointmentId",
                table: "ServiceRecords");
        }
    }
}
