using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBusinessHoursRanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TenantBusinessHoursRanges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    BusinessHoursId = table.Column<Guid>(type: "uuid", nullable: false),
                    OpenTime = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false, defaultValue: "08:00"),
                    CloseTime = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false, defaultValue: "18:00"),
                    SortOrder = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantBusinessHoursRanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TenantBusinessHoursRanges_TenantBusinessHours_BusinessHoursId",
                        column: x => x.BusinessHoursId,
                        principalTable: "TenantBusinessHours",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TenantBusinessHoursRanges_BusinessHoursId",
                table: "TenantBusinessHoursRanges",
                column: "BusinessHoursId");

            // Migrate existing data: copy OpenTime/CloseTime to the new ranges table
            migrationBuilder.Sql(@"
                INSERT INTO ""TenantBusinessHoursRanges"" (""Id"", ""BusinessHoursId"", ""OpenTime"", ""CloseTime"", ""SortOrder"")
                SELECT gen_random_uuid(), ""Id"", ""OpenTime"", ""CloseTime"", 0
                FROM ""TenantBusinessHours"";
            ");

            // Remove old columns from TenantBusinessHours
            migrationBuilder.DropColumn(name: "OpenTime", table: "TenantBusinessHours");
            migrationBuilder.DropColumn(name: "CloseTime", table: "TenantBusinessHours");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Re-add old columns
            migrationBuilder.AddColumn<string>(
                name: "OpenTime",
                table: "TenantBusinessHours",
                type: "character varying(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "08:00");

            migrationBuilder.AddColumn<string>(
                name: "CloseTime",
                table: "TenantBusinessHours",
                type: "character varying(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "18:00");

            // Restore first range into old columns
            migrationBuilder.Sql(@"
                UPDATE ""TenantBusinessHours"" bh
                SET ""OpenTime"" = r.""OpenTime"", ""CloseTime"" = r.""CloseTime""
                FROM (
                    SELECT DISTINCT ON (""BusinessHoursId"") ""BusinessHoursId"", ""OpenTime"", ""CloseTime""
                    FROM ""TenantBusinessHoursRanges""
                    ORDER BY ""BusinessHoursId"", ""SortOrder""
                ) r
                WHERE bh.""Id"" = r.""BusinessHoursId"";
            ");

            migrationBuilder.DropTable(name: "TenantBusinessHoursRanges");
        }
    }
}
