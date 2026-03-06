using System.Data;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Shared.Constants;
using VoroSalonCrm.Shared.Extensions;

namespace VoroSalonCrm.Infrastructure.Seeds
{
    public class DataSeeder : IDataSeeder
    {
        public async Task SeedAsync(JasmimDbContext context)
        {
            // Garante que o banco existe e está migrado
            await context.Database.MigrateAsync();

            // SEED: Notifications
            SeedNotifications(context);

            await context.SaveChangesAsync();

            // SEED: Roles
            SeedRoles(context);

            await context.SaveChangesAsync();

            // SEED: Tenant
            SeedTenants(context);

            await context.SaveChangesAsync();

            // SEED: Usuário Admin
            SeedUsers(context);

            await context.SaveChangesAsync();
        }

        private static void SeedNotifications(JasmimDbContext context)
        {
            if (!context.Notifications.IgnoreQueryFilters().Any())
            {
                var notifications = new List<Notification>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = NotificationEnum.Welcome.AsText(),
                        Subject = "Bem-vindo(a) ao sistema, {UserName}!",
                        Body = @"
                            <div style='font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 30px;'>
                                <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);'>
                                    <h2 style='color: #333333; text-align: center;'>Bem-vindo(a), {UserName}!</h2>
                                    <p style='color: #555555; font-size: 16px;'>Olá <strong>{UserName}</strong>,</p>
                                    <p style='color: #555555; font-size: 16px;'>
                                        Sua conta foi criada com sucesso! Estamos muito felizes em tê-lo(a) conosco.
                                    </p>
                                    <p style='color: #555555; font-size: 16px;'>
                                        Explore os recursos disponíveis e aproveite ao máximo sua experiência no sistema.
                                    </p>
                                    <br/>
                                    <p style='font-size: 15px; color: #888888; text-align: center;'>
                                        Atenciosamente,<br/>
                                        <strong>Equipe Suporte</strong>
                                    </p>
                                </div>
                            </div>",
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    },

                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = NotificationEnum.PasswordReset.AsText(),
                        Subject = "Redefinição de Senha - {UserName}",
                        Body = @"
                            <div style='font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 30px;'>
                                <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);'>
                                    <h2 style='color: #333333; text-align: center;'>Redefinição de Senha</h2>
                                    <p style='color: #555555; font-size: 16px;'>Olá <strong>{UserName}</strong>,</p>
                                    <p style='color: #555555; font-size: 16px;'>
                                        Recebemos uma solicitação para redefinir sua senha. Para continuar, clique no botão abaixo:
                                    </p>
                                    <div style='text-align: center; margin: 25px 0;'>
                                        <a href='{ResetLink}' style='background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>
                                            Redefinir Senha
                                        </a>
                                    </div>
                                    <p style='color: #777777; font-size: 14px;'>
                                        Se você não solicitou essa alteração, basta ignorar este e-mail.
                                    </p>
                                    <br/>
                                    <p style='font-size: 15px; color: #888888; text-align: center;'>
                                        Atenciosamente,<br/>
                                        <strong>Equipe Suporte</strong>
                                    </p>
                                </div>
                            </div>",
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    },

                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = NotificationEnum.ConfirmEmail.AsText(),
                        Subject = "Confirmação de E-mail - {UserName}",
                        Body = @"
                            <div style='font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 30px;'>
                                <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);'>
                                    <h2 style='color: #333333; text-align: center;'>Confirmação de E-mail</h2>
                                    <p style='color: #555555; font-size: 16px;'>Olá <strong>{UserName}</strong>,</p>
                                    <p style='color: #555555; font-size: 16px;'>
                                        Recebemos uma solicitação para confirmar seu e-mail. Para continuar, clique no botão abaixo:
                                    </p>
                                    <div style='text-align: center; margin: 25px 0;'>
                                        <a href='{ConfirmLink}' style='background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;'>
                                            Confirmar E-mail
                                        </a>
                                    </div>
                                    <p style='color: #777777; font-size: 14px;'>
                                        Se você não solicitou essa alteração, basta ignorar este e-mail.
                                    </p>
                                    <br/>
                                    <p style='font-size: 15px; color: #888888; text-align: center;'>
                                        Atenciosamente,<br/>
                                        <strong>Equipe Suporte</strong>
                                    </p>
                                </div>
                            </div>",
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    }
                };

                context.Notifications.AddRange(notifications);
            }
        }

        private static void SeedRoles(JasmimDbContext context)
        {
            if (!context.Roles.Any())
            {
                var roles = typeof(RoleConstant)
                    .GetFields(System.Reflection.BindingFlags.Public |
                                System.Reflection.BindingFlags.Static |
                                System.Reflection.BindingFlags.FlattenHierarchy)
                    .Where(fi => fi.IsLiteral && !fi.IsInitOnly)
                    .Select(fi => new Role
                    {
                        Id = Guid.Parse((string)fi.GetRawConstantValue()!),
                        Name = fi.Name.ToTitleCase(),
                        NormalizedName = fi.Name.ToUpper()
                    })
                    .ToList();

                context.Roles.AddRange(roles);
            }
        }

        private static void SeedTenants(JasmimDbContext context)
        {
            if (!context.Tenants.Any())
            {
                var tenant = new Tenant
                {
                    Name = "VoroLabs",
                    Slug = "vorolabs",
                    ContactEmail = "voro@vorolabs.app",
                    ContactPhone = "(11) 99999-0000",
                    IsActive = true,
                    PrimaryColor = "#0f172a",
                    SecondaryColor = "#6366f1",
                    ThemeMode = "light",
                    CreatedAt = DateTime.UtcNow
                };

                context.Tenants.Add(tenant);
            }
        }

        private static void SeedUsers(JasmimDbContext context)
        {
            if (!context.Users.IgnoreQueryFilters().Any())
            {
                var adminRole = context.Roles.FirstOrDefault(r => r.Name == "Admin");
                var tenant = context.Tenants.FirstOrDefault(t => t.Slug == "vorolabs");

                var admin = new User
                {
                    UserName = "jordan.silva",
                    NormalizedUserName = "jordan.silva".ToUpper(),
                    Email = "jordan@vorolabs.app",
                    NormalizedEmail = "jordan@vorolabs.app".ToUpper(),
                    FirstName = "Jordan",
                    LastName = "Silva",
                    CountryCode = "+55",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    BirthDate = DateTime.UtcNow,
                    SecurityStamp = "f87c07d8-3b68-4e35-b1e9-97c9021cf4e8",
                    UserTenants = [
                        new UserTenant
                        {
                            TenantId = tenant!.Id,
                            IsDefault = true
                        }
                    ],
                    UserRoles = [
                        new UserRole()
                        {
                            Role = adminRole
                        }
                    ],
                    UserExtension = new UserExtension()
                };

                context.Users.Add(admin);
            }
        }
    }
}
