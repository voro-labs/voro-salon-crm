using System.Data;
using Microsoft.AspNetCore.Identity;
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
        private readonly UserManager<User> _userManager;

        public DataSeeder(UserManager<User> userManager)
        {
            _userManager = userManager;
        }

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

            // SEED: Tenant Demo
            SeedDemoTenant(context);

            await context.SaveChangesAsync();

            // SEED: Usuário Admin
            SeedUsers(context);

            await context.SaveChangesAsync();

            // SEED: Reviewer (conta fixa para revisão Google Play / demo)
            await SeedReviewerUserAsync(context);

            await context.SaveChangesAsync();

            // SEED: Subscription Plans
            SeedSubscriptionPlans(context);

            await context.SaveChangesAsync();

            // SEED: Subscription for Demo Tenants
            SeedDemoSubscriptions(context);

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
                        Name = fi.Name,
                        NormalizedName = fi.Name.ToUpper()
                    })
                    .ToList();

                context.Roles.AddRange(roles);
            }
        }


        // GUIDs estáveis para upsert idempotente
        private static readonly Guid StarterPlanId = Guid.Parse("a1b2c3d4-0001-4000-8000-ef1234560001");
        private static readonly Guid ProPlanId     = Guid.Parse("a1b2c3d4-0001-4000-8000-ef1234560002");
        private static readonly Guid PremiumPlanId = Guid.Parse("a1b2c3d4-0001-4000-8000-ef1234560003");

        private static void SeedSubscriptionPlans(JasmimDbContext context)
        {
            var seed = new[]
            {
                // ── Starter — autônomo / solo ─────────────────────────────────
                // Entrega valor imediato (agenda digital) e cria o gatilho de
                // upgrade: o dono percebe que perde clientes por falta de lembrete
                new Domain.Entities.SubscriptionPlan
                {
                    Id = StarterPlanId,
                    Name = "Starter",
                    Description = "Para autônomos e salões solo que querem sair do caderno",
                    MonthlyPrice = 39.00m,
                    MaxEmployees = 3,
                    MaxClients = -1,          // ilimitado
                    HasEmployees = true,
                    HasAnamnesis = false,
                    HasFinancial = false,
                    HasReports = false,
                    HasBooking = false,
                    HasWhatsAppBot = false,   // gate de upgrade para Pro
                    DefaultTrialDays = 14,
                    SortOrder = 1,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                },

                // ── Pro ⭐ — 2 a 10 profissionais ─────────────────────────────
                // Principal plano: WhatsApp automático é o gate #1 de upgrade.
                // "1 cliente confirmado pelo bot já paga o sistema no mês."
                new Domain.Entities.SubscriptionPlan
                {
                    Id = ProPlanId,
                    Name = "Pro",
                    Description = "Para salões com equipe que querem acabar com o no-show",
                    MonthlyPrice = 79.00m,
                    MaxEmployees = 10,
                    MaxClients = -1,          // ilimitado
                    HasEmployees = true,
                    HasAnamnesis = false,     // gate de upgrade para Premium
                    HasFinancial = true,
                    HasReports = true,
                    HasBooking = true,
                    HasWhatsAppBot = true,    // diferencial principal vs concorrência
                    DefaultTrialDays = 14,
                    SortOrder = 2,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                },

                // ── Premium — salões maiores / foco em química ────────────────
                // Gate #2: anamnese capilar é diferencial para coloristas e
                // salões que precisam de registro clínico-estético completo
                new Domain.Entities.SubscriptionPlan
                {
                    Id = PremiumPlanId,
                    Name = "Premium",
                    Description = "Para salões maiores com foco em química e multi-profissional",
                    MonthlyPrice = 149.00m,
                    MaxEmployees = -1,        // ilimitado
                    MaxClients = -1,          // ilimitado
                    HasEmployees = true,
                    HasAnamnesis = true,      // ficha capilar + histórico completo
                    HasFinancial = true,
                    HasReports = true,
                    HasBooking = true,
                    HasWhatsAppBot = true,
                    DefaultTrialDays = 14,
                    SortOrder = 3,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                },
            };

            foreach (var plan in seed)
            {
                // Busca por ID estável primeiro; se não achar, busca pelo nome
                // (cobre rename de "Básico" → "Starter" e outros futuros renames)
                var existing = context.SubscriptionPlans
                    .IgnoreQueryFilters()
                    .FirstOrDefault(p => p.Id == plan.Id)
                    ?? context.SubscriptionPlans
                    .IgnoreQueryFilters()
                    .FirstOrDefault(p => p.Name == plan.Name || p.Name == "Básico" && plan.SortOrder == 1);

                if (existing == null)
                {
                    context.SubscriptionPlans.Add(plan);
                }
                else
                {
                    existing.Id               = plan.Id;
                    existing.Name             = plan.Name;
                    existing.Description      = plan.Description;
                    existing.MonthlyPrice     = plan.MonthlyPrice;
                    existing.MaxEmployees     = plan.MaxEmployees;
                    existing.MaxClients       = plan.MaxClients;
                    existing.HasEmployees     = plan.HasEmployees;
                    existing.HasAnamnesis     = plan.HasAnamnesis;
                    existing.HasFinancial     = plan.HasFinancial;
                    existing.HasReports       = plan.HasReports;
                    existing.HasBooking       = plan.HasBooking;
                    existing.HasWhatsAppBot   = plan.HasWhatsAppBot;
                    existing.DefaultTrialDays = plan.DefaultTrialDays;
                    existing.SortOrder        = plan.SortOrder;
                    existing.IsActive         = plan.IsActive;
                }
            }
        }

        private static void SeedDemoTenant(JasmimDbContext context)
        {
            var demos = new List<Tenant>
            {
                new() { Name = "Demo Starter", Slug = "vorostarter", ContactEmail = "starter@demo.com", IsDemo = true, IsActive = true, CreatedAt = DateTime.UtcNow, PrimaryColor = "#0f172a", SecondaryColor = "#6366f1", ThemeMode = "light" },
                new() { Name = "Demo Pro", Slug = "voropro", ContactEmail = "pro@demo.com", IsDemo = true, IsActive = true, CreatedAt = DateTime.UtcNow, PrimaryColor = "#0f172a", SecondaryColor = "#6366f1", ThemeMode = "light" },
                new() { Name = "Demo Premium", Slug = "voropremium", ContactEmail = "premium@demo.com", IsDemo = true, IsActive = true, CreatedAt = DateTime.UtcNow, PrimaryColor = "#0f172a", SecondaryColor = "#6366f1", ThemeMode = "light" }
            };

            foreach (var demo in demos)
            {
                if (!context.Tenants.IgnoreQueryFilters().Any(t => t.Slug == demo.Slug))
                {
                    context.Tenants.Add(demo);
                }
            }
        }

        private static void SeedDemoSubscriptions(JasmimDbContext context)
        {
            var demoPlans = new Dictionary<string, Guid>
            {
                { "vorostarter", StarterPlanId },
                { "voropro", ProPlanId },
                { "voropremium", PremiumPlanId }
            };

            foreach (var (slug, planId) in demoPlans)
            {
                var tenant = context.Tenants.IgnoreQueryFilters().FirstOrDefault(t => t.Slug == slug);
                if (tenant != null)
                {
                    var existing = context.TenantSubscriptions.IgnoreQueryFilters().Any(s => s.TenantId == tenant.Id);
                    if (!existing)
                    {
                        context.TenantSubscriptions.Add(new TenantSubscription
                        {
                            Id = Guid.NewGuid(),
                            TenantId = tenant.Id,
                            PlanId = planId,
                            Status = SubscriptionStatus.Active,
                            PaymentSource = PaymentSource.Manual,
                            StartDate = DateTimeOffset.UtcNow,
                            TrialEndsAt = DateTimeOffset.UtcNow.AddDays(30),
                            CreatedAt = DateTimeOffset.UtcNow
                        });
                    }
                }
            }
        }

        private async Task SeedReviewerUserAsync(JasmimDbContext context)
        {
            const string reviewerEmail = "reviewer@vorolabs.app";

            if (context.Users.IgnoreQueryFilters().Any(u => u.Email == reviewerEmail))
                return;

            var ownerRole = context.Roles.FirstOrDefault(r => r.Name == "SalonOwner");
            var demoTenants = context.Tenants.IgnoreQueryFilters().Where(t => t.IsDemo).ToList();

            if (!demoTenants.Any() || ownerRole == null)
                return;

            var mainTenant = demoTenants.FirstOrDefault(t => t.Slug == "voropremium") ?? demoTenants.First();

            var reviewer = new User
            {
                UserName = "reviewer.vorolabs",
                NormalizedUserName = "REVIEWER.VOROLABS",
                Email = reviewerEmail,
                NormalizedEmail = reviewerEmail.ToUpper(),
                EmailConfirmed = true,
                FirstName = "Reviewer",
                LastName = "Google",
                CountryCode = "+55",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                BirthDate = DateTime.UtcNow,
                SecurityStamp = Guid.NewGuid().ToString(),
                TwoFactorEnabled = true,
                UserTenants = demoTenants.Select((t, index) => new UserTenant
                {
                    TenantId = t.Id,
                    IsDefault = t.Id == mainTenant.Id || (index == 0 && mainTenant == null)
                }).ToList(),
                UserRoles =
                [
                    new UserRole
                    {
                        Role = ownerRole
                    }
                ],
                UserExtension = new UserExtension
                {
                    TermsAcceptedAt = DateTime.UtcNow,
                    PasswordChangedAt = DateTime.UtcNow,
                    MustChangePassword = false
                }
            };

            await _userManager.CreateAsync(reviewer, "Reviewer@123456!");
        }

        private static void SeedUsers(JasmimDbContext context)
        {
            if (!context.Users.IgnoreQueryFilters().Any(u => u.Email == "jordan@vorolabs.app"))
            {
                var adminRole = context.Roles.FirstOrDefault(r => r.Name == "Owner");
                var tenant = context.Tenants.IgnoreQueryFilters().FirstOrDefault(t => t.Slug == "voropremium");

                if (tenant == null || adminRole == null) return;
                
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
                            TenantId = tenant.Id,
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
