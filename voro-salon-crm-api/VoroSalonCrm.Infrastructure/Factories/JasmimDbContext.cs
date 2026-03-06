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
        public DbSet<UserExtension> UserExtensions { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Client> Clients { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<ServiceRecord> ServiceRecords { get; set; }


        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ---------------------------
            // GLOBAL QUERY FILTERS (Multi-Tenant)
            // ---------------------------
            builder.Entity<User>().HasQueryFilter(u =>
                !u.IsDeleted && u.TenantId == _currentUser.TenantId);

            builder.Entity<UserExtension>().HasQueryFilter(ue =>
                !ue.User.IsDeleted && ue.User.TenantId == _currentUser.TenantId);

            builder.Entity<Notification>().HasQueryFilter(n =>
                !n.IsDeleted && n.TenantId == _currentUser.TenantId);

            builder.Entity<Client>().HasQueryFilter(c =>
                !c.IsDeleted && c.TenantId == _currentUser.TenantId);

            builder.Entity<Service>().HasQueryFilter(s =>
                !s.IsDeleted && s.TenantId == _currentUser.TenantId);

            builder.Entity<ServiceRecord>().HasQueryFilter(s =>
                !s.IsDeleted && s.TenantId == _currentUser.TenantId);

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

                b.HasMany<User>()
                    .WithOne(u => u.Tenant)
                    .HasForeignKey(u => u.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
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
