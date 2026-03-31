using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateMobileUXFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "EmployeeId",
                table: "TimeSlotBlocks",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TimeSlotBlocks_EmployeeId",
                table: "TimeSlotBlocks",
                column: "EmployeeId");

            migrationBuilder.AddForeignKey(
                name: "FK_TimeSlotBlocks_Employees_EmployeeId",
                table: "TimeSlotBlocks",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TimeSlotBlocks_Employees_EmployeeId",
                table: "TimeSlotBlocks");

            migrationBuilder.DropIndex(
                name: "IX_TimeSlotBlocks_EmployeeId",
                table: "TimeSlotBlocks");

            migrationBuilder.DropColumn(
                name: "EmployeeId",
                table: "TimeSlotBlocks");
        }
    }
}
