using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantEvolutionInstanceLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TenantEvolutionInstanceLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    InstanceId = table.Column<Guid>(type: "uuid", nullable: false),
                    LinkedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantEvolutionInstanceLinks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantEvolutionInstanceLinks_TenantEvolutionInstances_Insta~",
                        column: x => x.InstanceId,
                        principalTable: "TenantEvolutionInstances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TenantEvolutionInstanceLinks_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantEvolutionInstanceLinks_InstanceId",
                table: "TenantEvolutionInstanceLinks",
                column: "InstanceId");

            migrationBuilder.CreateIndex(
                name: "IX_TenantEvolutionInstanceLinks_TenantId",
                table: "TenantEvolutionInstanceLinks",
                column: "TenantId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TenantEvolutionInstanceLinks");
        }
    }
}
