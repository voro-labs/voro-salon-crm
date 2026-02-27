using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VoroSwipeEntertainment.Application.Services;
using VoroSwipeEntertainment.Application.Services.Identity;
using VoroSwipeEntertainment.Application.Services.Interfaces;
using VoroSwipeEntertainment.Application.Services.Interfaces.Email;
using VoroSwipeEntertainment.Application.Services.Interfaces.Identity;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories;
using VoroSwipeEntertainment.Domain.Interfaces.Repositories.Identity;
using VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork;
using VoroSwipeEntertainment.Infrastructure.Email;
using VoroSwipeEntertainment.Infrastructure.Repositories;
using VoroSwipeEntertainment.Infrastructure.Repositories.Identity;
using VoroSwipeEntertainment.Infrastructure.Seeds;
using VoroSwipeEntertainment.Infrastructure.UnitOfWork;
using VoroSwipeEntertainment.Shared.Utils;

namespace VoroSwipeEntertainment.Contract.Extensions.Configurations
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
