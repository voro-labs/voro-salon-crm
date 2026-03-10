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


        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ---------------------------
            // GLOBAL QUERY FILTERS (Multi-Tenant)
            // ---------------------------
            builder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);

            builder.Entity<UserExtension>().HasQueryFilter(ue => !ue.User.IsDeleted);

            builder.Entity<Notification>().HasQueryFilter(n =>
                !n.IsDeleted && n.TenantId == _currentUser.TenantId);

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
                    .HasForeignKey(ut => ut.TenantId);

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

                b.HasOne<Tenant>()
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

                b.HasOne<Tenant>()
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

                b.HasOne<Tenant>()
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

                b.HasOne<Tenant>()
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

                b.HasIndex(e => e.TenantId);

                b.HasOne(e => e.Tenant)
                 .WithMany()
                 .HasForeignKey(e => e.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);
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

                b.HasOne<Tenant>()
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

                b.HasOne<Tenant>()
                 .WithMany()
                 .HasForeignKey(t => t.TenantId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(t => t.Category)
                 .WithMany()
                 .HasForeignKey(t => t.CategoryId)
                 .OnDelete(DeleteBehavior.SetNull); // Categoria excluída não afeta registros já consolidados, apenas anula o vínculo
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

            builder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
            builder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
            builder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");
            builder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
        }
    }
}
