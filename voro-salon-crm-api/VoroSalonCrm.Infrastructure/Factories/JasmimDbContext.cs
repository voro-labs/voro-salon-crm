using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;

namespace VoroSalonCrm.Infrastructure.Factories
{
    public class JasmimDbContext : IdentityDbContext<User, Role, Guid,
        IdentityUserClaim<Guid>, UserRole, IdentityUserLogin<Guid>,
        IdentityRoleClaim<Guid>, IdentityUserToken<Guid>>
    {
        private readonly ICurrentUserService _currentUser;

        public JasmimDbContext(
            DbContextOptions<JasmimDbContext> options,
            ICurrentUserService currentUser
        ) : base(options)
        {
            _currentUser = currentUser;
        }

        public Guid? CurrentUserId => _currentUser.UserId;

        // Expor explicitamente a entidade de junção
        //public DbSet<Exemplo> Exemplo { get; set; }
        public DbSet<Tenant> Tenants { get; set; }
        public DbSet<UserTenant> UserTenants { get; set; }
        public DbSet<UserExtension> UserExtensions { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Client> Clients { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<ServiceRecord> ServiceRecords { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<TenantModule> TenantModules { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<EmployeeService> EmployeeServices { get; set; }
        public DbSet<TransactionCategory> TransactionCategories { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<AnamnesisQuestion> AnamnesisQuestions { get; set; }
        public DbSet<AnamnesisSheet> AnamnesisSheets { get; set; }
        public DbSet<AnamnesisResponse> AnamnesisResponses { get; set; }
        public DbSet<AnamnesisEvidence> AnamnesisEvidences { get; set; }
        public DbSet<AnamnesisSignature> AnamnesisSignatures { get; set; }

        public DbSet<PasswordHistory> PasswordHistories { get; set; }

        public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
        public DbSet<TenantSubscription> TenantSubscriptions { get; set; }
        public DbSet<SubscriptionCoupon> SubscriptionCoupons { get; set; }

        public DbSet<TimeSlotBlock> TimeSlotBlocks { get; set; }
        public DbSet<TenantBusinessHours> TenantBusinessHours { get; set; }
        public DbSet<TenantBusinessHoursRange> TenantBusinessHoursRanges { get; set; }
        public DbSet<WhatsAppMessage> WhatsAppMessages { get; set; }
        public DbSet<WhatsAppConversation> WhatsAppConversations { get; set; }
        public DbSet<WhatsAppTemplate> WhatsAppTemplates { get; set; }

        public DbSet<ClientMembershipPlan> ClientMembershipPlans { get; set; }
        public DbSet<ClientMembership> ClientMemberships { get; set; }

        public DbSet<EmployeeGoal> EmployeeGoals { get; set; }
        public DbSet<ServicePromotion> ServicePromotions { get; set; }
        public DbSet<ClientRating> ClientRatings { get; set; }

        public DbSet<PushToken> PushTokens { get; set; }
        public DbSet<UserNotification> UserNotifications { get; set; }

        public DbSet<EntityAuditLog> EntityAuditLogs { get; set; }
        public DbSet<RouteAuditLog> RouteAuditLogs { get; set; }
        public DbSet<IntegrationAuditLog> IntegrationAuditLogs { get; set; }

        public DbSet<BookingFunnelSession> BookingFunnelSessions { get; set; }
        public DbSet<PendingPlanChange> PendingPlanChanges { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries()
                .Where(e => e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)
                .ToList();

            foreach (var entry in entries)
            {
                if (entry.Entity is EntityAuditLog || entry.Entity is RouteAuditLog || entry.Entity is IntegrationAuditLog)
                    continue;

                var auditLog = new EntityAuditLog
                {
                    EntityName = entry.Entity.GetType().Name,
                    Action = entry.State.ToString(),
                    Timestamp = DateTime.UtcNow,
                    TenantId = _currentUser.TenantId != Guid.Empty ? _currentUser.TenantId : null,
                    UserId = _currentUser.UserId != Guid.Empty ? _currentUser.UserId : null
                };

                var primaryKey = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
                if (primaryKey != null)
                {
                    auditLog.PrimaryKey = primaryKey.CurrentValue?.ToString();
                }

                if (entry.State == EntityState.Modified)
                {
                    var oldValues = new Dictionary<string, object?>();
                    var newValues = new Dictionary<string, object?>();

                    foreach (var property in entry.Properties)
                    {
                        if (property.IsModified)
                        {
                            oldValues[property.Metadata.Name] = property.OriginalValue;
                            newValues[property.Metadata.Name] = property.CurrentValue;
                        }
                    }

                    auditLog.OldValues = System.Text.Json.JsonSerializer.Serialize(oldValues);
                    auditLog.NewValues = System.Text.Json.JsonSerializer.Serialize(newValues);
                }
                else if (entry.State == EntityState.Added)
                {
                    var newValues = entry.Properties.ToDictionary(p => p.Metadata.Name, p => p.CurrentValue);
                    auditLog.NewValues = System.Text.Json.JsonSerializer.Serialize(newValues);
                }
                else if (entry.State == EntityState.Deleted)
                {
                    var oldValues = entry.Properties.ToDictionary(p => p.Metadata.Name, p => p.OriginalValue);
                    auditLog.OldValues = System.Text.Json.JsonSerializer.Serialize(oldValues);
                }

                EntityAuditLogs.Add(auditLog);
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ---------------------------
            // GLOBAL QUERY FILTERS (Multi-Tenant)
            // ---------------------------
            builder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);

            builder.Entity<UserExtension>().HasQueryFilter(ue => !ue.User.IsDeleted);

            builder.Entity<UserNotification>().HasQueryFilter(un =>
                !un.IsDeleted && un.TenantId == _currentUser.TenantId);

            builder.Entity<Notification>().HasQueryFilter(n =>
                !n.IsDeleted && (n.TenantId == _currentUser.TenantId || n.TenantId == Guid.Empty));

            builder.Entity<Client>().HasQueryFilter(c =>
                !c.IsDeleted && c.TenantId == _currentUser.TenantId);

            builder.Entity<Service>().HasQueryFilter(s =>
                !s.IsDeleted && s.TenantId == _currentUser.TenantId);

            builder.Entity<ServiceRecord>().HasQueryFilter(s =>
                !s.IsDeleted && s.TenantId == _currentUser.TenantId);

            builder.Entity<Appointment>().HasQueryFilter(a =>
                !a.IsDeleted && a.TenantId == _currentUser.TenantId);

            builder.Entity<TenantModule>().HasQueryFilter(tm =>
                tm.TenantId == _currentUser.TenantId);

            builder.Entity<Employee>().HasQueryFilter(e =>
                !e.IsDeleted && e.TenantId == _currentUser.TenantId);

            builder.Entity<TransactionCategory>().HasQueryFilter(tc =>
                !tc.IsDeleted && tc.TenantId == _currentUser.TenantId);

            builder.Entity<Transaction>().HasQueryFilter(t =>
                !t.IsDeleted && t.TenantId == _currentUser.TenantId);

            builder.Entity<AnamnesisQuestion>().HasQueryFilter(aq =>
                !aq.IsDeleted && aq.TenantId == _currentUser.TenantId);

            builder.Entity<TimeSlotBlock>().HasQueryFilter(b =>
                b.TenantId == _currentUser.TenantId);

            builder.Entity<AnamnesisSheet>().HasQueryFilter(asheet =>
                !asheet.IsDeleted && asheet.TenantId == _currentUser.TenantId);

            builder.Entity<WhatsAppTemplate>().HasQueryFilter(wt =>
                (wt.TenantId == _currentUser.TenantId || wt.TenantId == Guid.Empty));

            // ---------------------------
            // TENANT
            // ---------------------------
            builder.Entity<Tenant>(b =>
            {
                b.HasKey(t => t.Id);
                b.Property(t => t.Name).HasMaxLength(150).IsRequired();
                b.Property(t => t.Slug).HasMaxLength(100).IsRequired();
                b.HasIndex(t => t.Slug).IsUnique();
                b.Property(t => t.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.Property(t => t.IsActive).HasDefaultValue(true);
                b.Property(t => t.WhatsAppAccessToken).HasMaxLength(512);
                b.Property(t => t.WhatsAppDisplayPhone).HasMaxLength(30);
            });

            // ---------------------------
            // TENANT MODULE
            // ---------------------------
            builder.Entity<TenantModule>(b =>
            {
                b.HasKey(tm => tm.Id);
                b.Property(tm => tm.Module).HasConversion<int>().IsRequired();
                b.Property(tm => tm.IsEnabled).HasDefaultValue(true);
                b.Property(tm => tm.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasOne(tm => tm.Tenant)
                 .WithMany()
                 .HasForeignKey(tm => tm.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasIndex(tm => tm.TenantId);
                b.HasIndex(tm => new { tm.TenantId, tm.Module }).IsUnique();
            });

            // ---------------------------
            // USER TENANT (Join Table)
            // ---------------------------
            builder.Entity<UserTenant>(b =>
            {
                b.HasKey(ut => new { ut.UserId, ut.TenantId });

                b.HasOne(ut => ut.User)
                    .WithMany(u => u.UserTenants)
                    .HasForeignKey(ut => ut.UserId);

                b.HasOne(ut => ut.Tenant)
                    .WithMany(t => t.UserTenants)
                    .HasForeignKey(ut => ut.TenantId)
                    .OnDelete(DeleteBehavior.Cascade);

                b.Property(ut => ut.IsDefault).HasDefaultValue(false);
                b.Property(ut => ut.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
            });

            // ---------------------------
            // CLIENT
            // ---------------------------
            builder.Entity<Client>(b =>
            {
                b.HasKey(c => c.Id);
                b.Property(c => c.Name).HasMaxLength(200).IsRequired();
                b.Property(c => c.Phone).HasMaxLength(50);
                b.Property(c => c.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                // Indexes equivalentes ao SQL: idx_clients_tenant, idx_clients_name
                b.HasIndex(c => c.TenantId);
                b.HasIndex(c => new { c.TenantId, c.Name });

                b.HasOne(p => p.Tenant)
                 .WithMany()
                 .HasForeignKey(c => c.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // SERVICE
            // ---------------------------
            builder.Entity<Service>(b =>
            {
                b.HasKey(s => s.Id);
                b.Property(s => s.Name).HasMaxLength(200).IsRequired();
                b.Property(s => s.Price).HasColumnType("NUMERIC(10,2)").HasDefaultValue(0);
                b.Property(s => s.DurationMinutes).HasDefaultValue(30);
                b.Property(s => s.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(s => s.TenantId);

                b.HasOne(p => p.Tenant)
                 .WithMany()
                 .HasForeignKey(s => s.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // SERVICE RECORD
            // ---------------------------
            builder.Entity<ServiceRecord>(b =>
            {
                b.HasKey(s => s.Id);
                b.Property(s => s.ServiceDate).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.Property(s => s.Description).IsRequired();
                b.Property(s => s.Amount).HasColumnType("NUMERIC(10,2)").HasDefaultValue(0);
                b.Property(s => s.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                // Indexes equivalentes ao SQL: idx_services_tenant, idx_services_client, idx_services_date
                b.HasIndex(s => s.TenantId);
                b.HasIndex(s => s.ClientId);
                b.HasIndex(s => s.ServiceId);
                b.HasIndex(s => new { s.TenantId, s.ServiceDate }).IsDescending(false, true);

                b.HasOne(p => p.Tenant)
                 .WithMany()
                 .HasForeignKey(s => s.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(s => s.Client)
                 .WithMany()
                 .HasForeignKey(s => s.ClientId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(s => s.Service)
                 .WithMany()
                 .HasForeignKey(s => s.ServiceId)
                 .OnDelete(DeleteBehavior.SetNull);
            });

            // ---------------------------
            // APPOINTMENT (Agendamento)
            // ---------------------------
            builder.Entity<Appointment>(b =>
            {
                b.HasKey(a => a.Id);
                b.Property(a => a.ScheduledDateTime).IsRequired();
                b.Property(a => a.DurationMinutes).HasDefaultValue(30);
                b.Property(a => a.Status).HasConversion<int>().IsRequired();
                b.Property(a => a.Amount).HasColumnType("NUMERIC(10,2)").HasDefaultValue(0);
                b.Property(a => a.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(a => a.TenantId);
                b.HasIndex(a => a.ClientId);
                b.HasIndex(a => a.ServiceId);
                b.HasIndex(a => new { a.TenantId, a.ScheduledDateTime });

                b.HasOne(p => p.Tenant)
                 .WithMany()
                 .HasForeignKey(a => a.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(a => a.Client)
                 .WithMany()
                 .HasForeignKey(a => a.ClientId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(a => a.Service)
                 .WithMany()
                 .HasForeignKey(a => a.ServiceId)
                 .OnDelete(DeleteBehavior.SetNull);

                b.HasOne(a => a.Employee)
                 .WithMany()
                 .HasForeignKey(a => a.EmployeeId)
                 .OnDelete(DeleteBehavior.SetNull);
            });

            // ---------------------------
            // EMPLOYEE
            // ---------------------------
            builder.Entity<Employee>(b =>
            {
                b.HasKey(e => e.Id);
                b.Property(e => e.Name).HasMaxLength(200).IsRequired();
                b.Property(e => e.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.Property(e => e.IsActive).HasDefaultValue(true);
                b.Property(e => e.CommissionPercentage).HasColumnType("NUMERIC(5,2)");

                b.HasIndex(e => e.TenantId);

                b.HasOne(e => e.Tenant)
                 .WithMany()
                 .HasForeignKey(e => e.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(e => e.User)
                 .WithMany()
                 .HasForeignKey(e => e.UserId)
                 .OnDelete(DeleteBehavior.SetNull);
            });

            // ---------------------------
            // TRANSACTION CATEGORY
            // ---------------------------
            builder.Entity<TransactionCategory>(b =>
            {
                b.HasKey(tc => tc.Id);
                b.Property(tc => tc.Name).HasMaxLength(150).IsRequired();
                b.Property(tc => tc.Type).HasConversion<int>().IsRequired();
                b.Property(tc => tc.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.Property(tc => tc.IsActive).HasDefaultValue(true);

                b.HasIndex(tc => tc.TenantId);

                b.HasOne(p => p.Tenant)
                 .WithMany()
                 .HasForeignKey(tc => tc.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // TRANSACTION
            // ---------------------------
            builder.Entity<Transaction>(b =>
            {
                b.HasKey(t => t.Id);
                b.Property(t => t.Description).HasMaxLength(300).IsRequired();
                b.Property(t => t.Amount).HasColumnType("NUMERIC(10,2)").HasDefaultValue(0);
                b.Property(t => t.PaidAmount).HasColumnType("NUMERIC(10,2)").HasDefaultValue(0);
                b.Property(t => t.DueDate).IsRequired();
                b.Property(t => t.Type).HasConversion<int>().IsRequired();
                b.Property(t => t.PaymentMethod).HasConversion<int>().IsRequired();
                b.Property(t => t.Status).HasConversion<int>().IsRequired();
                b.Property(t => t.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(t => t.TenantId);
                b.HasIndex(t => new { t.TenantId, t.DueDate }).IsDescending(false, true);

                b.HasOne(p => p.Tenant)
                 .WithMany()
                 .HasForeignKey(t => t.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(t => t.Category)
                 .WithMany()
                 .HasForeignKey(t => t.CategoryId)
                 .OnDelete(DeleteBehavior.SetNull);

                b.HasOne(t => t.Employee)
                 .WithMany()
                 .HasForeignKey(t => t.EmployeeId)
                 .OnDelete(DeleteBehavior.SetNull);
            });

            // ---------------------------
            // EMPLOYEE SERVICE (Specialties)
            // ---------------------------
            builder.Entity<EmployeeService>(b =>
            {
                b.HasKey(es => new { es.EmployeeId, es.ServiceId });

                b.HasOne(es => es.Employee)
                 .WithMany(e => e.Specialties)
                 .HasForeignKey(es => es.EmployeeId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(es => es.Service)
                 .WithMany()
                 .HasForeignKey(es => es.ServiceId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<UserExtension>()
                .HasKey(ue => ue.UserId);

            builder.Entity<UserExtension>()
                .HasOne(ue => ue.User)
                .WithOne(u => u.UserExtension)
                .HasForeignKey<UserExtension>(ue => ue.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---------------------------
            // PASSWORD HISTORY
            // ---------------------------
            builder.Entity<PasswordHistory>(b =>
            {
                b.HasKey(ph => ph.Id);
                b.Property(ph => ph.PasswordHash).IsRequired();
                b.Property(ph => ph.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(ph => ph.UserId);
                b.HasIndex(ph => new { ph.UserId, ph.CreatedAt }).IsDescending(false, true);

                b.HasOne(ph => ph.User)
                 .WithMany()
                 .HasForeignKey(ph => ph.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // IDENTITY CONFIG
            // ---------------------------
            builder.Entity<User>().ToTable("Users");
            builder.Entity<Role>().ToTable("Roles");
            builder.Entity<UserRole>().ToTable("UserRoles");

            builder.Entity<User>(b =>
            {
                b.Property(u => u.FirstName).HasMaxLength(100);
                b.Property(u => u.LastName).HasMaxLength(100);
                b.Property(u => u.CountryCode).HasMaxLength(3);
                b.Property(u => u.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.Property(u => u.IsActive).HasDefaultValue(true);
            });

            builder.Entity<Role>(b =>
            {
                b.Property(r => r.Name).HasMaxLength(256);
            });

            builder.Entity<UserRole>(b =>
            {
                b.HasKey(ur => new { ur.UserId, ur.RoleId });

                b.HasOne(ur => ur.User)
                    .WithMany(u => u.UserRoles)
                    .HasForeignKey(ur => ur.UserId);

                b.HasOne(ur => ur.Role)
                    .WithMany(r => r.UserRoles)
                    .HasForeignKey(ur => ur.RoleId);
            });

            // ---------------------------
            // SUBSCRIPTION PLAN
            // ---------------------------
            builder.Entity<SubscriptionPlan>(b =>
            {
                b.HasKey(p => p.Id);
                b.Property(p => p.Name).HasMaxLength(100).IsRequired();
                b.Property(p => p.Description).HasMaxLength(500);
                b.Property(p => p.MonthlyPrice).HasColumnType("NUMERIC(10,2)").IsRequired();
                b.Property(p => p.PromoPrice).HasColumnType("NUMERIC(10,2)");
                b.Property(p => p.IsActive).HasDefaultValue(true);
                b.Property(p => p.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
            });

            // ---------------------------
            // TENANT SUBSCRIPTION
            // ---------------------------
            builder.Entity<TenantSubscription>(b =>
            {
                b.HasKey(s => s.Id);
                b.Property(s => s.Status).HasConversion<int>().IsRequired();
                b.Property(s => s.PaymentSource).HasConversion<int>().IsRequired();
                b.Property(s => s.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.Property(s => s.ContactEmail).HasMaxLength(256);
                b.Property(s => s.ContactName).HasMaxLength(200);
                b.Property(s => s.SalonName).HasMaxLength(150);
                b.Property(s => s.MercadoPagoSubscriptionId).HasMaxLength(100);
                b.Property(s => s.MercadoPagoPixPaymentId).HasMaxLength(100);
                b.Property(s => s.MercadoPagoExternalReference).HasMaxLength(300);
                b.Property(s => s.Notes).HasMaxLength(500);
                b.Property(s => s.LockedPromoPrice).HasColumnType("NUMERIC(10,2)");

                b.HasIndex(s => s.TenantId);
                b.HasIndex(s => s.MercadoPagoSubscriptionId);
                b.HasIndex(s => s.MercadoPagoPixPaymentId);

                b.HasOne(s => s.Tenant)
                 .WithMany()
                 .HasForeignKey(s => s.TenantId)
                 .OnDelete(DeleteBehavior.SetNull);

                b.HasOne(s => s.Plan)
                 .WithMany()
                 .HasForeignKey(s => s.PlanId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // ---------------------------
            // SUBSCRIPTION COUPON
            // ---------------------------
            builder.Entity<SubscriptionCoupon>(b =>
            {
                b.HasKey(c => c.Id);
                b.Property(c => c.Code).HasMaxLength(50).IsRequired();
                b.Property(c => c.Description).HasMaxLength(300);
                b.Property(c => c.TrialDays).HasDefaultValue(7);
                b.Property(c => c.IsActive).HasDefaultValue(true);
                b.Property(c => c.UsedCount).HasDefaultValue(0);
                b.Property(c => c.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.HasIndex(c => c.Code).IsUnique();
            });

            builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
            builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
            builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");
            builder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");

            // ---------------------------
            // ANAMNESIS QUESTION
            // ---------------------------
            builder.Entity<AnamnesisQuestion>(b =>
            {
                b.HasKey(aq => aq.Id);
                b.Property(aq => aq.Identifier).HasMaxLength(150).IsRequired();
                b.Property(aq => aq.Text).IsRequired();
                b.Property(aq => aq.FieldType).HasConversion<int>().IsRequired();
                b.Property(aq => aq.Section).HasConversion<int>().IsRequired();
                b.Property(aq => aq.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(aq => aq.TenantId);
                b.HasIndex(aq => new { aq.TenantId, aq.Identifier }).IsUnique();

                b.HasOne(aq => aq.Tenant)
                 .WithMany()
                 .HasForeignKey(aq => aq.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // ANAMNESIS SHEET
            // ---------------------------
            builder.Entity<AnamnesisSheet>(b =>
            {
                b.HasKey(asheet => asheet.Id);
                b.Property(asheet => asheet.Date).IsRequired();
                b.Property(asheet => asheet.Status).HasConversion<int>().IsRequired();
                b.Property(asheet => asheet.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(asheet => asheet.TenantId);
                b.HasIndex(asheet => asheet.ClientId);
                b.HasIndex(asheet => new { asheet.TenantId, asheet.Date });
                b.HasIndex(asheet => asheet.PublicToken).IsUnique().HasFilter("\"PublicToken\" IS NOT NULL");

                b.HasOne(asheet => asheet.Tenant)
                 .WithMany()
                 .HasForeignKey(asheet => asheet.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(asheet => asheet.Client)
                 .WithMany()
                 .HasForeignKey(asheet => asheet.ClientId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // ANAMNESIS RESPONSE
            // ---------------------------
            builder.Entity<AnamnesisResponse>(b =>
            {
                b.HasKey(ar => ar.Id);
                b.Property(ar => ar.Value).IsRequired();

                b.HasOne(ar => ar.Sheet)
                 .WithMany(asheet => asheet.Responses)
                 .HasForeignKey(ar => ar.SheetId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(ar => ar.Question)
                 .WithMany()
                 .HasForeignKey(ar => ar.QuestionId)
                 .OnDelete(DeleteBehavior.Restrict); // Prevent deleting questions used in response

                b.HasIndex(ar => ar.SheetId);
                b.HasIndex(ar => ar.QuestionId);
            });

            // ---------------------------
            // ANAMNESIS EVIDENCE
            // ---------------------------
            builder.Entity<AnamnesisEvidence>(b =>
            {
                b.HasKey(ae => ae.Id);
                b.Property(ae => ae.Url).IsRequired();
                b.Property(ae => ae.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasOne(ae => ae.Sheet)
                 .WithMany(asheet => asheet.Evidences)
                 .HasForeignKey(ae => ae.SheetId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasIndex(ae => ae.SheetId);
            });

            // ---------------------------
            // ANAMNESIS SIGNATURE
            // ---------------------------
            builder.Entity<AnamnesisSignature>(b =>
            {
                b.HasKey(asign => asign.Id);
                b.Property(asign => asign.Type).HasConversion<int>().IsRequired();
                b.Property(asign => asign.SignatureData).IsRequired();
                b.Property(asign => asign.SignedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasOne(asign => asign.Sheet)
                 .WithMany(asheet => asheet.Signatures)
                 .HasForeignKey(asign => asign.SheetId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasIndex(asign => asign.SheetId);
            });

            // ---------------------------
            // TIME SLOT BLOCK
            // ---------------------------
            builder.Entity<TimeSlotBlock>(b =>
            {
                b.HasKey(tsb => tsb.Id);
                b.Property(tsb => tsb.StartDateTime).IsRequired();
                b.Property(tsb => tsb.EndDateTime).IsRequired();
                b.Property(tsb => tsb.Reason).HasMaxLength(300);
                b.Property(tsb => tsb.ClientMessage).HasMaxLength(300);
                b.Property(tsb => tsb.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(tsb => tsb.TenantId);
                b.HasIndex(tsb => new { tsb.TenantId, tsb.StartDateTime });

                b.HasOne(tsb => tsb.Tenant)
                 .WithMany()
                 .HasForeignKey(tsb => tsb.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(tsb => tsb.Employee)
                 .WithMany()
                 .HasForeignKey(tsb => tsb.EmployeeId)
                 .OnDelete(DeleteBehavior.SetNull);
            });

            // ---------------------------
            // TENANT BUSINESS HOURS
            // ---------------------------
            builder.Entity<TenantBusinessHours>(b =>
            {
                b.HasKey(bh => bh.Id);
                b.Property(bh => bh.IsOpen).HasDefaultValue(true);

                b.HasIndex(bh => bh.TenantId);
                b.HasIndex(bh => new { bh.TenantId, bh.DayOfWeek }).IsUnique();

                b.HasOne(bh => bh.Tenant)
                 .WithMany()
                 .HasForeignKey(bh => bh.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasMany(bh => bh.Ranges)
                 .WithOne(r => r.BusinessHours)
                 .HasForeignKey(r => r.BusinessHoursId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<TenantBusinessHoursRange>(b =>
            {
                b.HasKey(r => r.Id);
                b.Property(r => r.OpenTime).HasMaxLength(5).HasDefaultValue("08:00");
                b.Property(r => r.CloseTime).HasMaxLength(5).HasDefaultValue("18:00");
                b.Property(r => r.SortOrder).HasDefaultValue(0);
                b.HasIndex(r => r.BusinessHoursId);
            });

            // ---------------------------
            // PUSH TOKEN
            // ---------------------------
            builder.Entity<PushToken>(b =>
            {
                b.HasKey(pt => pt.Id);
                b.Property(pt => pt.Token).HasMaxLength(500).IsRequired();
                b.Property(pt => pt.Platform).HasMaxLength(20).IsRequired();
                b.Property(pt => pt.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.HasIndex(pt => pt.UserId);
                b.HasIndex(pt => pt.Token).IsUnique();

                b.HasOne(pt => pt.User)
                 .WithMany()
                 .HasForeignKey(pt => pt.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // USER NOTIFICATION
            // ---------------------------
            builder.Entity<UserNotification>(b =>
            {
                b.HasKey(n => n.Id);
                b.Property(n => n.Title).HasMaxLength(200).IsRequired();
                b.Property(n => n.Body).HasMaxLength(500).IsRequired();
                b.Property(n => n.Type).HasMaxLength(100).IsRequired();
                b.Property(n => n.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.HasIndex(n => n.UserId);
                b.HasIndex(n => new { n.UserId, n.IsRead });
                b.HasIndex(n => new { n.UserId, n.CreatedAt }).IsDescending(false, true);

                b.HasOne(n => n.Tenant)
                 .WithMany()
                 .HasForeignKey(n => n.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ---------------------------
            // WHATSAPP TEMPLATE
            // ---------------------------
            builder.Entity<WhatsAppTemplate>(b =>
            {
                b.HasKey(wt => wt.Id);
                b.Property(wt => wt.Id).ValueGeneratedOnAdd();
                b.Property(wt => wt.Name).IsRequired();
                b.Property(wt => wt.Label).IsRequired();
            });

            // ---------------------------
            // EMPLOYEE GOAL
            // ---------------------------
            builder.Entity<EmployeeGoal>(b =>
            {
                b.HasKey(g => g.Id);
                b.Property(g => g.TargetAmount).HasColumnType("NUMERIC(10,2)").IsRequired();
                b.Property(g => g.TargetAppointments).IsRequired();
                b.Property(g => g.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(g => g.TenantId);
                b.HasIndex(g => new { g.TenantId, g.EmployeeId, g.Month, g.Year }).IsUnique();

                b.HasOne(g => g.Tenant)
                 .WithMany()
                 .HasForeignKey(g => g.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(g => g.Employee)
                 .WithMany()
                 .HasForeignKey(g => g.EmployeeId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // Filtro global para EmployeeGoal
            builder.Entity<EmployeeGoal>().HasQueryFilter(g =>
                g.TenantId == _currentUser.TenantId);

            // ---------------------------
            // SERVICE PROMOTION
            // ---------------------------
            builder.Entity<ServicePromotion>(b =>
            {
                b.HasKey(sp => sp.Id);
                b.Property(sp => sp.PromotionalPrice).HasColumnType("NUMERIC(10,2)").IsRequired();
                b.Property(sp => sp.IsActive).HasDefaultValue(true);
                b.Property(sp => sp.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");
                b.Property(sp => sp.DaysOfWeek).HasColumnType("integer[]");

                b.HasIndex(sp => sp.TenantId);
                b.HasIndex(sp => new { sp.TenantId, sp.ServiceId });

                b.HasOne(sp => sp.Tenant)
                 .WithMany()
                 .HasForeignKey(sp => sp.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(sp => sp.Service)
                 .WithMany()
                 .HasForeignKey(sp => sp.ServiceId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<ServicePromotion>().HasQueryFilter(sp =>
                sp.TenantId == _currentUser.TenantId);

            // ---------------------------
            // CLIENT RATING
            // ---------------------------
            builder.Entity<ClientRating>(b =>
            {
                b.HasKey(cr => cr.Id);
                b.Property(cr => cr.Stars).IsRequired();
                b.Property(cr => cr.Source).HasConversion<int>().IsRequired();
                b.Property(cr => cr.Comment).HasMaxLength(1000);
                b.Property(cr => cr.CreatedAt).HasDefaultValueSql("TIMEZONE('utc', NOW())");

                b.HasIndex(cr => cr.TenantId);
                b.HasIndex(cr => cr.AppointmentId).IsUnique(); // one rating per appointment
                b.HasIndex(cr => cr.ClientId);

                b.HasOne(cr => cr.Tenant)
                 .WithMany()
                 .HasForeignKey(cr => cr.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(cr => cr.Appointment)
                 .WithMany()
                 .HasForeignKey(cr => cr.AppointmentId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(cr => cr.Client)
                 .WithMany()
                 .HasForeignKey(cr => cr.ClientId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<ClientRating>().HasQueryFilter(cr =>
                cr.TenantId == _currentUser.TenantId);

            // ---------------------------
            // PENDING PLAN CHANGE
            // ---------------------------
            builder.Entity<PendingPlanChange>(e =>
            {
                e.ToTable("PendingPlanChanges");
                e.HasKey(x => x.Id);
                e.Property(x => x.SubscriptionSnapshot).HasMaxLength(4000);
                e.HasIndex(x => x.TenantId);
                e.HasIndex(x => x.ExpiresAt);
            });
        }
    }
}
