using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanModuleFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasBooking",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasEmployees",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasWhatsAppBot",
                table: "SubscriptionPlans",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Atualizar planos existentes com os valores corretos por nome
            migrationBuilder.Sql(@"
                UPDATE ""SubscriptionPlans"" SET
                    ""HasEmployees"" = false,
                    ""HasBooking""   = false,
                    ""HasWhatsAppBot"" = false,
                    ""MaxEmployees"" = 1
                WHERE ""Name"" = 'Básico';

                UPDATE ""SubscriptionPlans"" SET
                    ""HasEmployees"" = true,
                    ""HasBooking""   = true,
                    ""HasWhatsAppBot"" = false
                WHERE ""Name"" = 'Pro';

                UPDATE ""SubscriptionPlans"" SET
                    ""HasEmployees"" = true,
                    ""HasBooking""   = true,
                    ""HasWhatsAppBot"" = true
                WHERE ""Name"" = 'Premium';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasBooking",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "HasEmployees",
                table: "SubscriptionPlans");

            migrationBuilder.DropColumn(
                name: "HasWhatsAppBot",
                table: "SubscriptionPlans");
        }
    }
}
