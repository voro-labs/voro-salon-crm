using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnamnesis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnamnesisQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Identifier = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Text = table.Column<string>(type: "text", nullable: false),
                    FieldType = table.Column<int>(type: "integer", nullable: false),
                    Options = table.Column<string>(type: "text", nullable: true),
                    Section = table.Column<int>(type: "integer", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    IsRequired = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnamnesisQuestions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AnamnesisSheets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProfessionalId = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Diagnosis = table.Column<string>(type: "text", nullable: true),
                    TreatmentProtocol = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnamnesisSheets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnamnesisSheets_Clients_ClientId",
                        column: x => x.ClientId,
                        principalTable: "Clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnamnesisEvidences",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SheetId = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnamnesisEvidences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnamnesisEvidences_AnamnesisSheets_SheetId",
                        column: x => x.SheetId,
                        principalTable: "AnamnesisSheets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnamnesisResponses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SheetId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnamnesisResponses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnamnesisResponses_AnamnesisQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "AnamnesisQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AnamnesisResponses_AnamnesisSheets_SheetId",
                        column: x => x.SheetId,
                        principalTable: "AnamnesisSheets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnamnesisSignatures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SheetId = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    SignatureData = table.Column<string>(type: "text", nullable: false),
                    SignedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "TIMEZONE('utc', NOW())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnamnesisSignatures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AnamnesisSignatures_AnamnesisSheets_SheetId",
                        column: x => x.SheetId,
                        principalTable: "AnamnesisSheets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisEvidences_SheetId",
                table: "AnamnesisEvidences",
                column: "SheetId");

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisQuestions_TenantId",
                table: "AnamnesisQuestions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisQuestions_TenantId_Identifier",
                table: "AnamnesisQuestions",
                columns: new[] { "TenantId", "Identifier" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisResponses_QuestionId",
                table: "AnamnesisResponses",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisResponses_SheetId",
                table: "AnamnesisResponses",
                column: "SheetId");

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisSheets_ClientId",
                table: "AnamnesisSheets",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisSheets_TenantId",
                table: "AnamnesisSheets",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisSheets_TenantId_Date",
                table: "AnamnesisSheets",
                columns: new[] { "TenantId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_AnamnesisSignatures_SheetId",
                table: "AnamnesisSignatures",
                column: "SheetId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnamnesisEvidences");

            migrationBuilder.DropTable(
                name: "AnamnesisResponses");

            migrationBuilder.DropTable(
                name: "AnamnesisSignatures");

            migrationBuilder.DropTable(
                name: "AnamnesisQuestions");

            migrationBuilder.DropTable(
                name: "AnamnesisSheets");
        }
    }
}
