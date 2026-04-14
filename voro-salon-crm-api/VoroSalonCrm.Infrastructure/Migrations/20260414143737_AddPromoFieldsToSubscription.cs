using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VoroSalonCrm.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPromoFieldsToSubscription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // SubscriptionPlan: preço promocional e data de expiração da promo
            migrationBuilder.AddColumn<decimal>(
                name: "PromoPrice",
                table: "SubscriptionPlans",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PromoEndsAt",
                table: "SubscriptionPlans",
                type: "timestamp with time zone",
                nullable: true);

            // TenantSubscription: preço promocional bloqueado no momento da assinatura
            migrationBuilder.AddColumn<decimal>(
                name: "LockedPromoPrice",
                table: "TenantSubscriptions",
                type: "numeric(10,2)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PromoPrice",      table: "SubscriptionPlans");
            migrationBuilder.DropColumn(name: "PromoEndsAt",     table: "SubscriptionPlans");
            migrationBuilder.DropColumn(name: "LockedPromoPrice", table: "TenantSubscriptions");
        }
    }
}
