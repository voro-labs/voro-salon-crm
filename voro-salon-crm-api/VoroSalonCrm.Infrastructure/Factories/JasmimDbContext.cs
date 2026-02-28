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
        public DbSet<UserExtension> UserExtensions { get; set; }
        public DbSet<Notification> Notifications { get; set; }


        public DbSet<MediaItem> MediaItems { get; set; }
        public DbSet<Genre> Genres { get; set; }
        public DbSet<Keyword> Keywords { get; set; }

        public DbSet<MediaGenre> MediaGenres { get; set; }
        public DbSet<MediaKeyword> MediaKeywords { get; set; }

        public DbSet<UserMediaInteraction> UserMediaInteractions { get; set; }
        public DbSet<UserMediaList> UserMediaLists { get; set; }

        public DbSet<UserGenreScore> UserGenreScores { get; set; }
        public DbSet<UserKeywordScore> UserKeywordScores { get; set; }
        public DbSet<UserEraScore> UserEraScores { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            
            // ---------------------------
            // USER EXTENSION
            // ---------------------------
            builder.Entity<UserExtension>()
                .HasKey(ue => ue.UserId);

            builder.Entity<UserExtension>()
                .HasIndex(p => new { p.UserId, p.ContentType })
                .IsUnique();

            builder.Entity<UserExtension>()
                .HasOne(ue => ue.User)
                .WithOne(u => u.UserExtension)
                .HasForeignKey<UserExtension>(ue => ue.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---------------------------
            // MEDIA ITEM
            // ---------------------------
            builder.Entity<MediaItem>()
                .HasKey(m => m.Id);

            builder.Entity<MediaItem>()
                .Property(m => m.Title)
                .HasMaxLength(200)
                .IsRequired();

            builder.Entity<MediaItem>()
                .HasIndex(m => m.Slug)
                .IsUnique();

            builder.Entity<MediaItem>()
                .HasIndex(m => new { m.Type, m.Year });

            // ---------------------------
            // GENRE
            // ---------------------------
            builder.Entity<Genre>()
                .HasKey(g => g.Id);

            builder.Entity<Genre>()
                .Property(g => g.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.Entity<Genre>()
                .HasIndex(g => g.Name)
                .IsUnique();

            // ---------------------------
            // KEYWORD
            // ---------------------------
            builder.Entity<Keyword>()
                .HasKey(k => k.Id);

            builder.Entity<Keyword>()
                .Property(k => k.Name)
                .HasMaxLength(100)
                .IsRequired();

            builder.Entity<Keyword>()
                .HasIndex(k => k.Name)
                .IsUnique();

            // ---------------------------
            // MEDIA ↔ GENRE (N:N)
            // ---------------------------
            builder.Entity<MediaGenre>()
                .HasKey(mg => new { mg.MediaItemId, mg.GenreId });

            builder.Entity<MediaGenre>()
                .HasOne(mg => mg.MediaItem)
                .WithMany(m => m.Genres)
                .HasForeignKey(mg => mg.MediaItemId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<MediaGenre>()
                .HasOne(mg => mg.Genre)
                .WithMany(g => g.MediaGenres)
                .HasForeignKey(mg => mg.GenreId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---------------------------
            // MEDIA ↔ KEYWORD (N:N)
            // ---------------------------
            builder.Entity<MediaKeyword>()
                .HasKey(mk => new { mk.MediaItemId, mk.KeywordId });

            builder.Entity<MediaKeyword>()
                .HasOne(mk => mk.MediaItem)
                .WithMany(m => m.Keywords)
                .HasForeignKey(mk => mk.MediaItemId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<MediaKeyword>()
                .HasOne(mk => mk.Keyword)
                .WithMany(k => k.MediaKeywords)
                .HasForeignKey(mk => mk.KeywordId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---------------------------
            // USER MEDIA INTERACTION
            // ---------------------------
            builder.Entity<UserMediaInteraction>()
                .HasKey(x => x.Id);

            builder.Entity<UserMediaInteraction>()
                .HasIndex(x => new { x.UserId, x.MediaItemId })
                .IsUnique();

            builder.Entity<UserMediaInteraction>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<UserMediaInteraction>()
                .HasOne(x => x.MediaItem)
                .WithMany()
                .HasForeignKey(x => x.MediaItemId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---------------------------
            // USER MEDIA LIST (want / consumed)
            // ---------------------------
            builder.Entity<UserMediaList>()
                .HasKey(x => x.Id);

            builder.Entity<UserMediaList>()
                .HasIndex(x => new { x.UserId, x.MediaItemId })
                .IsUnique();

            builder.Entity<UserMediaList>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<UserMediaList>()
                .HasOne(x => x.MediaItem)
                .WithMany()
                .HasForeignKey(x => x.MediaItemId)
                .OnDelete(DeleteBehavior.Cascade);

            // ---------------------------
            // USER GENRE SCORE
            // ---------------------------
            builder.Entity<UserGenreScore>()
                .HasKey(x => x.Id);

            builder.Entity<UserGenreScore>()
                .HasIndex(x => new { x.UserId, x.GenreId })
                .IsUnique();

            builder.Entity<UserGenreScore>()
                .HasOne(x => x.User)
                .WithMany(p => p.GenreScores)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<UserGenreScore>()
                .HasOne(x => x.Genre)
                .WithMany()
                .HasForeignKey(x => x.GenreId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---------------------------
            // USER KEYWORD SCORE
            // ---------------------------
            builder.Entity<UserKeywordScore>()
                .HasKey(x => x.Id);

            builder.Entity<UserKeywordScore>()
                .HasIndex(x => new { x.UserId, x.KeywordId })
                .IsUnique();

            builder.Entity<UserKeywordScore>()
                .HasOne(x => x.User)
                .WithMany(p => p.KeywordScores)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<UserKeywordScore>()
                .HasOne(x => x.Keyword)
                .WithMany()
                .HasForeignKey(x => x.KeywordId)
                .OnDelete(DeleteBehavior.Restrict);

            // ---------------------------
            // USER ERA SCORE
            // ---------------------------
            builder.Entity<UserEraScore>()
                .HasKey(x => x.Id);

            builder.Entity<UserEraScore>()
                .HasIndex(x => new { x.UserId, x.Era })
                .IsUnique();

            builder.Entity<UserEraScore>()
                .HasOne(x => x.User)
                .WithMany(p => p.EraScores)
                .HasForeignKey(x => x.UserId)
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
