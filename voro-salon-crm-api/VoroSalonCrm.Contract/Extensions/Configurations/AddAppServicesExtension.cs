using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Identity;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Email;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Email;
using VoroSalonCrm.Infrastructure.Repositories;
using VoroSalonCrm.Infrastructure.Repositories.Identity;
using VoroSalonCrm.Infrastructure.Seeds;
using VoroSalonCrm.Infrastructure.UnitOfWork;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Contract.Extensions.Configurations
{
    public static class AddAppServicesExtension
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<MailUtil>(configuration.GetSection("EmailSettings"));
            services.Configure<CookieUtil>(configuration.GetSection("CookieSettings"));
            services.Configure<IntegrationUtil>(configuration.GetSection("IntegrationSettings"));

            services.AddScoped<IDataSeeder, DataSeeder>();
            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<ICurrentUserService, CurrentUserService>();
            services.AddScoped<IMailKitEmailService, MailKitEmailService>();

            #region Identity Repositories
            services.AddScoped<IRoleRepository, RoleRepository>();
            services.AddScoped<IUserExtensionRepository, UserExtensionRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IUserRoleRepository, UserRoleRepository>();
            services.AddScoped<INotificationRepository, NotificationRepository>();
            #endregion

            #region Repositories
            services.AddScoped<IMediaItemRepository, MediaItemRepository>();
            services.AddScoped<IGenreRepository, GenreRepository>();
            services.AddScoped<IKeywordRepository, KeywordRepository>();
            services.AddScoped<IMediaGenreRepository, MediaGenreRepository>();
            services.AddScoped<IMediaKeywordRepository, MediaKeywordRepository>();
            services.AddScoped<IUserMediaInteractionRepository, UserMediaInteractionRepository>();
            services.AddScoped<IUserMediaListRepository, UserMediaListRepository>();
            services.AddScoped<IUserGenreScoreRepository, UserGenreScoreRepository>();
            services.AddScoped<IUserKeywordScoreRepository, UserKeywordScoreRepository>();
            services.AddScoped<IUserEraScoreRepository, UserEraScoreRepository>();
            #endregion

            #region Identity Services
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IUserExtensionService, UserExtensionService>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped<IUserRoleService, UserRoleService>();
            services.AddScoped<INotificationService, NotificationService>();
            #endregion

            #region Services
            services.AddScoped<IMediaItemService, MediaItemService>();
            services.AddScoped<IGenreService, GenreService>();
            services.AddScoped<IKeywordService, KeywordService>();
            services.AddScoped<IMediaGenreService, MediaGenreService>();
            services.AddScoped<IMediaKeywordService, MediaKeywordService>();
            services.AddScoped<IUserMediaInteractionService, UserMediaInteractionService>();
            services.AddScoped<IUserMediaListService, UserMediaListService>();
            services.AddScoped<IUserGenreScoreService, UserGenreScoreService>();
            services.AddScoped<IUserKeywordScoreService, UserKeywordScoreService>();
            
            services.AddScoped<IContentService, ContentService>();
            services.AddScoped<ITmdbService, TmdbService>();
            services.AddScoped<IAnilistService, AnilistService>();
            services.AddScoped<IGoogleBooksService, GoogleBooksService>();
            #endregion

            return services;
        }
    }
}
