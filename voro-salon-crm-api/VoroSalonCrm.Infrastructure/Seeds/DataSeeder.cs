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

            // SEED: Subscription Plans
            SeedSubscriptionPlans(context);

            await context.SaveChangesAsync();
        }

        private static void SeedNotifications(JasmimDbContext context)
        {
            // Adicionar template de conta criada automaticamente se ainda não existir
            var accountCreatedName = NotificationEnum.AccountCreated.AsText();
            if (!context.Notifications.IgnoreQueryFilters().Any(n => n.Name == accountCreatedName))
            {
                context.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    Name = accountCreatedName,
                    Subject = "Sua conta no Voro Salon foi criada! — {TenantName}",
                    Body = @"
                    <div style='font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px;'>
                    <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.07);'>

                        <!-- Header com cor do tenant -->
                        <div style='background-color: {TenantPrimaryColor}; padding: 28px 32px; text-align: center;'>
                        <img src='{TenantLogoUrl}' alt='{TenantName}' style='max-height: 56px; max-width: 200px; object-fit: contain;' onerror=""this.style.display='none'"" />
                        <h1 style='color: #ffffff; margin: 12px 0 0; font-size: 22px; font-weight: 700;'>{TenantName}</h1>
                        </div>

                        <!-- Corpo -->
                        <div style='padding: 32px;'>
                        <h2 style='color: #18181b; font-size: 20px; margin-top: 0;'>Bem-vindo(a), {UserName}! 🎉</h2>
                        <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                            Seu pagamento foi confirmado e sua conta no <strong>Voro Salon CRM</strong> foi criada com sucesso.
                        </p>
                        <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                            Use as credenciais abaixo para acessar o sistema pela primeira vez:
                        </p>
                        <table role='presentation' cellpadding='0' cellspacing='0' style='border-collapse: collapse; margin: 20px 0; width: 100%;'>
                            <tr>
                            <td style='background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px;'>
                                <p style='margin: 0 0 8px; font-size: 13px; color: #71717a;'>E-mail de acesso</p>
                                <p style='margin: 0; font-size: 15px; font-weight: 700; color: #18181b;'>{Email}</p>
                                <p style='margin: 12px 0 4px; font-size: 13px; color: #71717a;'>Senha temporária</p>
                                <p style='margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 2px; color: {TenantPrimaryColor};'>{TemporaryPassword}</p>
                            </td>
                            </tr>
                        </table>
                        <p style='color: #52525b; font-size: 14px; line-height: 1.6;'>
                            Ao fazer login, você precisará: aceitar os <strong>termos de uso</strong>, criar uma <strong>nova senha</strong> e completar o seu <strong>perfil</strong>.
                        </p>
                        <div style='text-align: center; margin: 28px 0;'>
                            <a href='{LoginUrl}' style='background-color: {TenantPrimaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;'>
                            Acessar o Sistema
                            </a>
                        </div>
                        <p style='color: #a1a1aa; font-size: 13px;'>
                            Por segurança, altere sua senha assim que fizer o primeiro acesso. Não compartilhe estas credenciais com ninguém.
                        </p>
                        </div>

                        <!-- Rodapé -->
                        <div style='background-color: #f9f9f9; border-top: 1px solid #e4e4e7; padding: 20px 32px; text-align: center;'>
                        <p style='color: #a1a1aa; font-size: 13px; margin: 0;'>
                            <strong style='color: #52525b;'>{TenantName}</strong><br/>
                            {TenantPhone} &nbsp;|&nbsp; {TenantEmail}
                        </p>
                        <p style='color: #d4d4d8; font-size: 12px; margin: 8px 0 0;'>
                            Este e-mail foi enviado automaticamente, por favor não responda.
                        </p>
                        </div>

                    </div>
                    </div>",
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            if (!context.Notifications.IgnoreQueryFilters().Any())
            {
                var notifications = new List<Notification>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = NotificationEnum.Welcome.AsText(),
                        Subject = "Bem-vindo(a) ao {TenantName}, {UserName}!",
                        Body = @"
                        <div style='font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px;'>
                        <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.07);'>

                            <!-- Header com cor do tenant -->
                            <div style='background-color: {TenantPrimaryColor}; padding: 28px 32px; text-align: center;'>
                            <img src='{TenantLogoUrl}' alt='{TenantName}' style='max-height: 56px; max-width: 200px; object-fit: contain;' onerror=""this.style.display='none'"" />
                            <h1 style='color: #ffffff; margin: 12px 0 0; font-size: 22px; font-weight: 700;'>{TenantName}</h1>
                            </div>

                            <!-- Corpo -->
                            <div style='padding: 32px;'>
                            <h2 style='color: #18181b; font-size: 20px; margin-top: 0;'>Olá, {UserName}! 👋</h2>
                            <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                                Sua conta foi criada com sucesso no <strong>{TenantName}</strong>. Estamos felizes em tê-lo(a) com a gente!
                            </p>
                            <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                                Acesse o sistema e explore todos os recursos disponíveis para gerenciar seu salão com praticidade.
                            </p>
                            </div>

                            <!-- Rodapé com contato do tenant -->
                            <div style='background-color: #f9f9f9; border-top: 1px solid #e4e4e7; padding: 20px 32px; text-align: center;'>
                            <p style='color: #a1a1aa; font-size: 13px; margin: 0;'>
                                <strong style='color: #52525b;'>{TenantName}</strong><br/>
                                {TenantPhone} &nbsp;|&nbsp; {TenantEmail}
                            </p>
                            <p style='color: #d4d4d8; font-size: 12px; margin: 8px 0 0;'>
                                Este e-mail foi enviado automaticamente, por favor não responda.
                            </p>
                            </div>

                        </div>
                        </div>",
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    },

                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = NotificationEnum.PasswordReset.AsText(),
                        Subject = "Redefinição de senha — {TenantName}",
                        Body = @"
                        <div style='font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px;'>
                        <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.07);'>

                            <!-- Header -->
                            <div style='background-color: {TenantPrimaryColor}; padding: 28px 32px; text-align: center;'>
                            <img src='{TenantLogoUrl}' alt='{TenantName}' style='max-height: 56px; max-width: 200px; object-fit: contain;' onerror=""this.style.display='none'"" />
                            <h1 style='color: #ffffff; margin: 12px 0 0; font-size: 22px; font-weight: 700;'>{TenantName}</h1>
                            </div>

                            <!-- Corpo -->
                            <div style='padding: 32px;'>
                            <h2 style='color: #18181b; font-size: 20px; margin-top: 0;'>Redefinição de senha</h2>
                            <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                                Olá, <strong>{UserName}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta em <strong>{TenantName}</strong>.
                            </p>
                            <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                                Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>24 horas</strong>.
                            </p>
                            <div style='text-align: center; margin: 28px 0;'>
                                <a href='{ResetLink}' style='background-color: {TenantPrimaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;'>
                                Redefinir Senha
                                </a>
                            </div>
                            <p style='color: #a1a1aa; font-size: 13px;'>
                                Se você não solicitou essa alteração, ignore este e-mail. Sua senha permanecerá a mesma.
                            </p>
                            </div>

                            <!-- Rodapé -->
                            <div style='background-color: #f9f9f9; border-top: 1px solid #e4e4e7; padding: 20px 32px; text-align: center;'>
                            <p style='color: #a1a1aa; font-size: 13px; margin: 0;'>
                                <strong style='color: #52525b;'>{TenantName}</strong><br/>
                                {TenantPhone} &nbsp;|&nbsp; {TenantEmail}
                            </p>
                            <p style='color: #d4d4d8; font-size: 12px; margin: 8px 0 0;'>
                                Este e-mail foi enviado automaticamente, por favor não responda.
                            </p>
                            </div>

                        </div>
                        </div>",
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    },

                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = NotificationEnum.TwoFactorCode.AsText(),
                        Subject = "Seu código de verificação — {TenantName}",
                        Body = @"
                        <div style='font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px;'>
                        <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.07);'>

                            <!-- Header -->
                            <div style='background-color: {TenantPrimaryColor}; padding: 28px 32px; text-align: center;'>
                            <img src='{TenantLogoUrl}' alt='{TenantName}' style='max-height: 56px; max-width: 200px; object-fit: contain;' onerror=""this.style.display='none'"" />
                            <h1 style='color: #ffffff; margin: 12px 0 0; font-size: 22px; font-weight: 700;'>{TenantName}</h1>
                            </div>

                            <!-- Corpo -->
                            <div style='padding: 32px; text-align: center;'>
                            <h2 style='color: #18181b; font-size: 20px; margin-top: 0;'>Verificação em duas etapas</h2>
                            <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                                Olá, <strong>{UserName}</strong>! Use o código abaixo para concluir seu acesso ao <strong>{TenantName}</strong>.
                            </p>
                            <table role='presentation' cellpadding='0' cellspacing='0' style='border-collapse: collapse; margin: 28px auto;'>
                                <tr>
                                <td style='background-color: #f4f4f5; border: 2px dashed {TenantPrimaryColor}; border-radius: 12px; padding: 16px 32px; text-align: center;'>
                                    <span style='font-size: 32px; font-weight: 900; letter-spacing: 8px; color: {TenantPrimaryColor}; white-space: nowrap;'>{TwoFactorCode}</span>
                                </td>
                                </tr>
                            </table>
                            <p style='color: #71717a; font-size: 13px; margin-top: 8px;'>
                                Este código é válido por <strong>10 minutos</strong>. Não compartilhe com ninguém.
                            </p>
                            <p style='color: #a1a1aa; font-size: 13px; margin-top: 16px;'>
                                Se você não tentou fazer login, ignore este e-mail. Sua senha permanecerá a mesma.
                            </p>
                            </div>

                            <!-- Rodapé -->
                            <div style='background-color: #f9f9f9; border-top: 1px solid #e4e4e7; padding: 20px 32px; text-align: center;'>
                            <p style='color: #a1a1aa; font-size: 13px; margin: 0;'>
                                <strong style='color: #52525b;'>{TenantName}</strong><br/>
                                {TenantPhone} &nbsp;|&nbsp; {TenantEmail}
                            </p>
                            <p style='color: #d4d4d8; font-size: 12px; margin: 8px 0 0;'>
                                Este e-mail foi enviado automaticamente, por favor não responda.
                            </p>
                            </div>

                        </div>
                        </div>",
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    },

                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = NotificationEnum.ConfirmEmail.AsText(),
                        Subject = "Confirme seu e-mail — {TenantName}",
                        Body = @"
                        <div style='font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px;'>
                        <div style='max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.07);'>

                            <!-- Header -->
                            <div style='background-color: {TenantPrimaryColor}; padding: 28px 32px; text-align: center;'>
                            <img src='{TenantLogoUrl}' alt='{TenantName}' style='max-height: 56px; max-width: 200px; object-fit: contain;' onerror=""this.style.display='none'"" />
                            <h1 style='color: #ffffff; margin: 12px 0 0; font-size: 22px; font-weight: 700;'>{TenantName}</h1>
                            </div>

                            <!-- Corpo -->
                            <div style='padding: 32px;'>
                            <h2 style='color: #18181b; font-size: 20px; margin-top: 0;'>Confirme seu e-mail ✉️</h2>
                            <p style='color: #52525b; font-size: 15px; line-height: 1.6;'>
                                Olá, <strong>{UserName}</strong>! Para ativar sua conta no <strong>{TenantName}</strong>, confirme seu endereço de e-mail clicando no botão abaixo.
                            </p>
                            <div style='text-align: center; margin: 28px 0;'>
                                <a href='{ConfirmLink}' style='background-color: {TenantPrimaryColor}; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;'>
                                Confirmar E-mail
                                </a>
                            </div>
                            <p style='color: #a1a1aa; font-size: 13px;'>
                                Se você não criou uma conta em <strong>{TenantName}</strong>, basta ignorar este e-mail.
                            </p>
                            </div>

                            <!-- Rodapé -->
                            <div style='background-color: #f9f9f9; border-top: 1px solid #e4e4e7; padding: 20px 32px; text-align: center;'>
                            <p style='color: #a1a1aa; font-size: 13px; margin: 0;'>
                                <strong style='color: #52525b;'>{TenantName}</strong><br/>
                                {TenantPhone} &nbsp;|&nbsp; {TenantEmail}
                            </p>
                            <p style='color: #d4d4d8; font-size: 12px; margin: 8px 0 0;'>
                                Este e-mail foi enviado automaticamente, por favor não responda.
                            </p>
                            </div>

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

        private static void SeedSubscriptionPlans(JasmimDbContext context)
        {
            if (!context.SubscriptionPlans.Any())
            {
                var plans = new List<Domain.Entities.SubscriptionPlan>
                {
                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = "Básico",
                        Description = "Ideal para salões que estão começando",
                        MonthlyPrice = 49.90m,
                        MaxEmployees = 2,
                        MaxClients = 100,
                        HasAnamnesis = false,
                        HasFinancial = false,
                        HasReports = false,
                        SortOrder = 1,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = "Pro",
                        Description = "Para salões em crescimento com mais recursos",
                        MonthlyPrice = 99.90m,
                        MaxEmployees = 5,
                        MaxClients = 500,
                        HasAnamnesis = false,
                        HasFinancial = true,
                        HasReports = true,
                        SortOrder = 2,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    },
                    new()
                    {
                        Id = Guid.NewGuid(),
                        Name = "Premium",
                        Description = "Tudo ilimitado para salões de alto volume",
                        MonthlyPrice = 199.90m,
                        MaxEmployees = -1,
                        MaxClients = -1,
                        HasAnamnesis = true,
                        HasFinancial = true,
                        HasReports = true,
                        SortOrder = 3,
                        IsActive = true,
                        CreatedAt = DateTimeOffset.UtcNow
                    }
                };

                context.SubscriptionPlans.AddRange(plans);
            }
        }

        private static void SeedUsers(JasmimDbContext context)
        {
            if (!context.Users.IgnoreQueryFilters().Any())
            {
                var adminRole = context.Roles.FirstOrDefault(r => r.Name == "Owner");
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
