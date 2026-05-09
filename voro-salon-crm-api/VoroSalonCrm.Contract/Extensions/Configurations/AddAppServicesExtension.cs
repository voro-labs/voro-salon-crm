using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VoroSalonCrm.Application.Services;
using VoroSalonCrm.Application.Services.Identity;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Blob;
using VoroSalonCrm.Application.Services.Interfaces.Email;
using VoroSalonCrm.Application.Services.Interfaces.Identity;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Blob;
using VoroSalonCrm.Infrastructure.Email;
using VoroSalonCrm.Infrastructure.Integration;
using VoroSalonCrm.Infrastructure.Repositories;
using VoroSalonCrm.Infrastructure.Repositories.Identity;
using Microsoft.Extensions.Hosting;
using VoroSalonCrm.Infrastructure.Seeds;
using VoroSalonCrm.Infrastructure.UnitOfWork;
using VoroSalonCrm.Shared.Utils;

namespace VoroSalonCrm.Contract.Extensions.Configurations
{
    public static class AddAppServicesExtension
    {
        public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddHttpClient("vercel-blob", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(100);
            });

            services.AddHttpClient("whatsapp", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            });

            services.AddHttpClient("whatsapp-graph", client =>
            {
                client.BaseAddress = new Uri("https://graph.facebook.com/");
                client.Timeout = TimeSpan.FromSeconds(30);
            });

            services.AddHttpClient("evolution-go", client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            });

            services.AddHttpClient("expo-push", client =>
            {
                client.BaseAddress = new Uri("https://exp.host");
                client.Timeout = TimeSpan.FromSeconds(30);
            });

            services.AddHttpClient("gemini", client =>
            {
                client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
                client.Timeout = TimeSpan.FromSeconds(30);
            });

            services.AddHttpClient("openai", client =>
            {
                client.BaseAddress = new Uri("https://api.openai.com/");
                client.Timeout = TimeSpan.FromSeconds(120);
            });

            services.Configure<BlobUtil>(configuration.GetSection("BlobSettings"));
            services.Configure<MailUtil>(configuration.GetSection("EmailSettings"));
            services.Configure<CookieUtil>(configuration.GetSection("CookieSettings"));
            services.Configure<IntegrationUtil>(configuration.GetSection("IntegrationSettings"));

            services.AddScoped<IDataSeeder, DataSeeder>();
            services.AddScoped<IDemoResetService, DemoResetService>();
            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IBlobService, BlobService>();
            services.AddScoped<ICurrentUserService, CurrentUserService>();
            services.AddScoped<IMailKitEmailService, MailKitEmailService>();
            services.AddScoped<IIntegrationAuditService, IntegrationAuditService>();
            var whatsappProvider = configuration["IntegrationSettings:Whatsapp:Provider"] ?? "meta";
            if (whatsappProvider.Equals("evolution", StringComparison.OrdinalIgnoreCase))
                services.AddScoped<IWhatsappService, EvolutionWhatsappService>();
            else
                services.AddScoped<IWhatsappService, WhatsappService>();
            services.AddScoped<IWhatsappChatService, WhatsappChatService>();
            services.AddScoped<IWhatsAppMessageService, WhatsAppMessageService>();

            #region Identity Repositories
            services.AddScoped<IRoleRepository, RoleRepository>();
            services.AddScoped<IUserExtensionRepository, UserExtensionRepository>();
            services.AddScoped<IPasswordHistoryRepository, PasswordHistoryRepository>();
            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IUserRoleRepository, UserRoleRepository>();
            services.AddScoped<INotificationRepository, NotificationRepository>();
            services.AddScoped<ITenantRepository, TenantRepository>();
            services.AddScoped<IUserTenantRepository, UserTenantRepository>();
            services.AddScoped<IIntegrationAuditRepository, IntegrationAuditRepository>();
            services.AddScoped<IClientRepository, ClientRepository>();
            services.AddScoped<IServiceRepository, ServiceRepository>();
            services.AddScoped<IServiceRecordRepository, ServiceRecordRepository>();
            services.AddScoped<IAppointmentRepository, AppointmentRepository>();
            services.AddScoped<ITimeSlotBlockRepository, TimeSlotBlockRepository>();
            services.AddScoped<ITenantBusinessHoursRepository, TenantBusinessHoursRepository>();
            services.AddScoped<IWhatsAppMessageRepository, WhatsAppMessageRepository>();
            services.AddScoped<IWhatsAppConversationRepository, WhatsAppConversationRepository>();
            services.AddScoped<IWhatsAppTemplateRepository, WhatsAppTemplateRepository>();
            services.AddScoped<ITenantModuleRepository, TenantModuleRepository>();
            services.AddScoped<IEmployeeRepository, EmployeeRepository>();
            services.AddScoped<ITransactionCategoryRepository, TransactionCategoryRepository>();
            services.AddScoped<ITransactionRepository, TransactionRepository>();
            services.AddScoped<IAnamnesisQuestionRepository, AnamnesisQuestionRepository>();
            services.AddScoped<IAnamnesisSheetRepository, AnamnesisSheetRepository>();
            services.AddScoped<ISubscriptionPlanRepository, SubscriptionPlanRepository>();
            services.AddScoped<ITenantSubscriptionRepository, TenantSubscriptionRepository>();
            services.AddScoped<ISubscriptionCouponRepository, SubscriptionCouponRepository>();
            services.AddScoped<IPendingPlanChangeRepository, PendingPlanChangeRepository>();
            services.AddScoped<IPushTokenRepository, PushTokenRepository>();
            services.AddScoped<IUserNotificationRepository, UserNotificationRepository>();
            services.AddScoped<IClientMembershipPlanRepository, ClientMembershipPlanRepository>();
            services.AddScoped<IClientMembershipRepository, ClientMembershipRepository>();
            #endregion

            #region Identity Services
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IUserExtensionService, UserExtensionService>();
            services.AddScoped<IRoleService, RoleService>();
            services.AddScoped<IUserRoleService, UserRoleService>();
            services.AddScoped<INotificationService, NotificationService>();
            services.AddScoped<ITenantService, TenantService>();
            services.AddScoped<IClientService, ClientService>();
            services.AddScoped<IServiceService, ServiceService>();
            services.AddScoped<IServiceRecordService, ServiceRecordService>();
            services.AddScoped<IDashboardService, DashboardService>();
            services.AddScoped<IExportService, ExportService>();
            services.AddScoped<IAppointmentService, AppointmentService>();
            services.AddScoped<ITimeSlotBlockService, TimeSlotBlockService>();
            services.AddScoped<ITenantBusinessHoursService, TenantBusinessHoursService>();
            services.AddScoped<ITenantModuleService, TenantModuleService>();
            services.AddScoped<IEmployeeService, EmployeeService>();
            services.AddScoped<IPublicBookingService, PublicBookingService>();
            services.AddScoped<ITransactionCategoryService, TransactionCategoryService>();
            services.AddScoped<ITransactionService, TransactionService>();
            services.AddScoped<IAnamnesisService, AnamnesisService>();
            services.AddScoped<ISubscriptionService, SubscriptionService>();
            services.AddScoped<IMercadoPagoService, MercadoPagoService>();
            services.AddScoped<IExpoPushNotificationService, ExpoPushNotificationService>();
            services.AddScoped<IUserNotificationService, UserNotificationService>();
            services.AddScoped<IWhatsAppTemplateService, WhatsAppTemplateService>();
            services.AddScoped<IWhatsAppOnboardingService, WhatsAppOnboardingService>();
            services.AddScoped<IClientMembershipService, ClientMembershipService>();
            services.AddScoped<IGeminiService, GeminiService>();
            services.AddScoped<IWhisperService, WhisperService>();
            services.AddScoped<IAIConversationService, AIConversationService>();
            services.AddScoped<IEmployeeGoalRepository, EmployeeGoalRepository>();
            services.AddScoped<IEmployeeGoalService, EmployeeGoalService>();
            services.AddScoped<IBirthdayGreetingService, BirthdayGreetingService>();
            services.AddScoped<IEvolutionInstanceService, EvolutionInstanceService>();
            services.AddScoped<IServicePromotionRepository, ServicePromotionRepository>();
            services.AddScoped<IServicePromotionService, ServicePromotionService>();
            services.AddScoped<IClientRatingRepository, ClientRatingRepository>();
            services.AddScoped<IClientRatingService, ClientRatingService>();
            services.AddScoped<IBookingFunnelSessionRepository, BookingFunnelSessionRepository>();
            services.AddScoped<IAIConversationRepository, AIConversationRepository>();
            services.AddScoped<ITenantEvolutionInstanceRepository, TenantEvolutionInstanceRepository>();
            services.AddScoped<IEvolutionTemplateRepository, EvolutionTemplateRepository>();
            services.AddScoped<IEvolutionTemplateService, EvolutionTemplateService>();
            services.AddScoped<IEvolutionService, EvolutionService>();
            services.AddScoped<IEvolutionRulesEngine, EvolutionRulesEngine>();
            services.AddScoped<IEvolutionAIResponder, EvolutionAIResponder>();
            services.AddScoped<IEvolutionResponseService, EvolutionResponseService>();
            services.AddScoped<IEvolutionBookingChatService, EvolutionBookingChatService>();
            #endregion

            services.AddHostedService<AppointmentReminderBackgroundService>();
            services.AddHostedService<MembershipExpirationNotificationJob>();
            services.AddHostedService<ExpiredCheckoutCleanupJob>();
            services.AddHostedService<ExpiredPendingPlanChangeCleanupJob>();
            services.AddHostedService<EvolutionResponseWorker>();

            return services;
        }
    }
}
