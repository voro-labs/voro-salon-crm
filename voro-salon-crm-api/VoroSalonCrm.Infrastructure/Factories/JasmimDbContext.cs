using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Entities.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using VoroSalonCrm.Application.Services.Interfaces;

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


        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ---------------------------
            // GLOBAL QUERY FILTERS (Multi-Tenant)
            // ---------------------------
            var currentTenantId = _currentUser.TenantId;

            builder.Entity<User>().HasQueryFilter(u =>
                !u.IsDeleted && u.TenantId == currentTenantId);

            builder.Entity<UserExtension>().HasQueryFilter(ue =>
                !ue.User.IsDeleted && ue.User.TenantId == currentTenantId);

            builder.Entity<Notification>().HasQueryFilter(n =>
                !n.IsDeleted && n.TenantId == currentTenantId);

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
