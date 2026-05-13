using MediatR;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class PublicBookingService(
        IMediator mediator,
        ITenantRepository tenantRepository,
        IClientRepository clientRepository,
        IServiceRepository serviceRepository,
        IEmployeeRepository employeeRepository,
        IAppointmentRepository appointmentRepository,
        IUnitOfWork unitOfWork,
        IUserTenantRepository userTenantRepository,
        IExpoPushNotificationService expoPushNotificationService,
        ITimeSlotBlockRepository timeSlotBlockRepository,
        ITenantModuleRepository tenantModuleRepository,
        ITenantSubscriptionRepository tenantSubscriptionRepository,
        ITenantBusinessHoursRepository businessHoursRepository,
        IServicePromotionRepository servicePromotionRepository,
        IClientRatingRepository clientRatingRepository,
        IBookingFunnelSessionRepository funnelRepository,
        ICacheService cacheService) : IPublicBookingService
    {
        private readonly IMediator _mediator = mediator;
        private readonly IUserTenantRepository _userTenantRepository = userTenantRepository;
        private readonly IExpoPushNotificationService _expoPushNotificationService = expoPushNotificationService;
        private readonly ITimeSlotBlockRepository _timeSlotBlockRepository = timeSlotBlockRepository;
        private readonly ITenantModuleRepository _tenantModuleRepository = tenantModuleRepository;
        private readonly ITenantSubscriptionRepository _tenantSubscriptionRepository = tenantSubscriptionRepository;
        private readonly IServicePromotionRepository _servicePromotionRepository = servicePromotionRepository;
        private readonly IClientRatingRepository _clientRatingRepository = clientRatingRepository;
        private readonly IBookingFunnelSessionRepository _funnelRepository = funnelRepository;
        private readonly ICacheService _cacheService = cacheService;

        public async Task<PublicTenantDto?> GetTenantBySlugAsync(string slug)
        {
            var cacheKey = $"public:tenant:{slug}";
            var cached = await _cacheService.GetAsync<PublicTenantDto>(cacheKey);
            if (cached is not null) return cached;

            var tenant = await tenantRepository.GetBySlugAsync(slug);
            if (tenant == null) return null;

            // Check plan feature flag first
            var subscription = await _tenantSubscriptionRepository.GetByTenantIdWithPlanAsync(tenant.Id);
            var planHasBooking = subscription?.Plan?.HasBooking ?? false; // default false if no subscription found

            // Also check the module toggle (can be disabled manually)
            // var bookingModule = await _tenantModuleRepository.GetModuleAsync(tenant.Id, AppModule.Booking);
            // var moduleEnabled = bookingModule == null || bookingModule.IsEnabled;

            // var isBookingEnabled = planHasBooking && moduleEnabled;
            var isBookingEnabled = planHasBooking;

            var allBusinessHours = await businessHoursRepository.GetByTenantAsync(tenant.Id);
            var businessHoursDtos = allBusinessHours.Select(h => new PublicBusinessHourDto(
                h.DayOfWeek,
                h.IsOpen,
                h.Ranges.Select(r => new PublicBusinessHourRangeDto(r.OpenTime, r.CloseTime)).ToList()
            )).ToList();

            var result = new PublicTenantDto(
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.ContactPhone,
                tenant.LogoUrl,
                tenant.PrimaryColor,
                tenant.SecondaryColor,
                tenant.ThemeMode?.ToString(),
                isBookingEnabled,
                tenant.DefaultPage,
                tenant.AppointmentViewMode
            )
            {
                BusinessHours = businessHoursDtos.Count > 0 ? businessHoursDtos : null
            };

            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
            return result;
        }

        public async Task<PublicClientDto?> CheckClientByPhoneAsync(string tenantSlug, string phone)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return null;

            var client = await clientRepository.GetByPhoneAsync(tenant.Id, phone);
            if (client == null) return null;

            return new PublicClientDto(client.Id, client.Name, client.Phone ?? string.Empty);
        }

        public async Task<IEnumerable<PublicServiceDto>> GetServicesByTenantAsync(string tenantSlug)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return Enumerable.Empty<PublicServiceDto>();

            var cacheKey = $"public:services:{tenant.Id}";
            var cachedServices = await _cacheService.GetAsync<List<PublicServiceDto>>(cacheKey);
            if (cachedServices is not null) return cachedServices;

            var services = await serviceRepository.GetPublicActiveByTenantAsync(tenant.Id);

            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
            var todayDow = (int)today.DayOfWeek;

            var promotions = await _servicePromotionRepository
                .Query(p =>
                    p.TenantId == tenant.Id &&
                    p.IsActive &&
                    p.DaysOfWeek.Contains(todayDow) &&
                    (p.ValidFrom == null || p.ValidFrom <= today) &&
                    (p.ValidUntil == null || p.ValidUntil >= today))
                .IgnoreQueryFilters()
                .ToListAsync();

            var serviceResult = services.Select(s =>
            {
                var promo = promotions.FirstOrDefault(p => p.ServiceId == s.Id);
                return new PublicServiceDto(s.Id, s.Name, s.Price, s.DurationMinutes,
                    s.Category, promo?.PromotionalPrice, promo != null);
            }).ToList();

            await _cacheService.SetAsync(cacheKey, serviceResult, TimeSpan.FromMinutes(5));
            return serviceResult;
        }

        public async Task<IEnumerable<PublicEmployeeDto>> GetEmployeesByServiceAsync(string tenantSlug, Guid serviceId)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return Enumerable.Empty<PublicEmployeeDto>();

            var cacheKey = $"public:employees:{tenant.Id}:{serviceId}";
            var cachedEmployees = await _cacheService.GetAsync<List<PublicEmployeeDto>>(cacheKey);
            if (cachedEmployees is not null) return cachedEmployees;

            var employees = await employeeRepository.GetPublicEmployeesByServiceAsync(tenant.Id, serviceId);

            var employeeResult = employees.Select(e => new PublicEmployeeDto(e.Id, e.Name, e.PhotoUrl)).ToList();

            await _cacheService.SetAsync(cacheKey, employeeResult, TimeSpan.FromMinutes(5));
            return employeeResult;
        }

        public async Task<PublicBookingResponseDto> CreateBookingAsync(PublicBookingCreateDto dto)
            => await _mediator.Send(new Features.PublicBooking.Commands.CreateBookingCommand(dto));

        public async Task<IEnumerable<DTOs.CRM.AvailabilitySlotDto>> GetAvailableSlotsAsync(
            string tenantSlug, DateTime date, Guid? serviceId = null, Guid? employeeId = null, List<Guid>? serviceIds = null)
            => await _mediator.Send(new Features.PublicBooking.Queries.GetAvailableSlotsQuery(tenantSlug, date, serviceId, employeeId, serviceIds));

        public async Task<PublicReceiptDto?> GetAppointmentReceiptAsync(Guid id)
        {
            var appointment = await appointmentRepository.Query(a => a.Id == id)
                .Include(a => a.Client)
                .Include(a => a.Service)
                .Include(a => a.Employee)
                .Include(a => a.Tenant)
                .Include(a => a.Services).ThenInclude(s => s.Service)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (appointment == null) return null;

            var tenantDto = await GetTenantBySlugAsync(appointment.Tenant.Slug);
            if (tenantDto == null) return null;

            // Agenda do dia para o cliente ver o contexto (mostra slots ocupados/livres)
            var dayAgenda = await GetAvailableSlotsAsync(
                appointment.Tenant.Slug,
                appointment.ScheduledDateTime.Date,
                appointment.ServiceId,
                appointment.EmployeeId);

            var existingRating = await _clientRatingRepository
                .Query(r => r.AppointmentId == appointment.Id)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            var canRate = appointment.Status == AppointmentStatus.Completed && existingRating == null;

            // Build service names from join table, falling back to single Service, then Description
            IEnumerable<string> serviceNames;
            if (appointment.Services != null && appointment.Services.Count > 0)
                serviceNames = appointment.Services.Select(s => s.Service?.Name ?? "Serviço").ToList();
            else if (appointment.Service != null)
                serviceNames = [appointment.Service.Name];
            else if (!string.IsNullOrWhiteSpace(appointment.Description))
            {
                // Description pode ser "Serviço A, Serviço B | observação" — extrai só a parte dos serviços
                var descPart = appointment.Description.Split(" | ")[0].Trim();
                serviceNames = [descPart];
            }
            else
                serviceNames = ["Serviço"];

            var combinedServiceName = string.Join(", ", serviceNames);

            return new PublicReceiptDto(
                appointment.Id,
                appointment.Client.Name,
                combinedServiceName,
                appointment.Employee?.Name,
                appointment.ScheduledDateTime,
                appointment.DurationMinutes,
                appointment.Amount,
                appointment.Status.ToString(),
                tenantDto,
                dayAgenda,
                existingRating?.Stars,
                canRate,
                serviceNames
            );
        }

        public async Task TrackFunnelStepAsync(PublicBookingTrackDto dto)
        {
            var tenant = await tenantRepository.Query(t => t.Slug == dto.TenantSlug && t.IsActive)
                .FirstOrDefaultAsync();
            if (tenant == null) return;

            var existing = await _funnelRepository
                .Query(s => s.TenantId == tenant.Id && s.SessionId == dto.SessionId)
                .FirstOrDefaultAsync();

            if (existing == null)
            {
                await _funnelRepository.AddAsync(new BookingFunnelSession
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenant.Id,
                    SessionId = dto.SessionId,
                    FunnelState = dto.FunnelState,
                    Source = 3,
                    ContactName = dto.ContactName,
                    PhoneNumber = dto.PhoneNumber,
                    AppointmentId = dto.AppointmentId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow,
                });
            }
            else
            {
                existing.FunnelState = dto.FunnelState;
                if (!string.IsNullOrEmpty(dto.ContactName)) existing.ContactName = dto.ContactName;
                if (!string.IsNullOrEmpty(dto.PhoneNumber)) existing.PhoneNumber = dto.PhoneNumber;
                if (dto.AppointmentId.HasValue) existing.AppointmentId = dto.AppointmentId;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                _funnelRepository.Update(existing);
            }

            await unitOfWork.CommitAsync();
        }
    }
}
