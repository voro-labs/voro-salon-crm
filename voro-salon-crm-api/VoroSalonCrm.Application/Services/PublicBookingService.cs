using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using AppointmentServiceEntity = VoroSalonCrm.Domain.Entities.AppointmentService;

namespace VoroSalonCrm.Application.Services
{
    public class PublicBookingService(
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
        {
            var tenant = await tenantRepository.GetBySlugAsync(dto.TenantSlug);
            if (tenant == null) return new PublicBookingResponseDto(false, "Estabelecimento não encontrado.", null);

            var serviceIds = dto.ResolvedServiceIds();

            // Load all requested services (pode ser vazio quando múltiplos serviços vêm na description)
            var services = new List<Service>();
            foreach (var sid in serviceIds)
            {
                var svc = await serviceRepository.GetPublicByIdAsync(tenant.Id, sid);
                if (svc == null)
                    return new PublicBookingResponseDto(false, $"Serviço não encontrado: {sid}.", null);
                services.Add(svc);
            }

            // Resolve promotional prices and sum totals
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(-3));
            var todayDow = (int)today.DayOfWeek;
            decimal totalAmount = 0;
            int totalDuration = 0;

            if (services.Count > 0)
            {
                foreach (var svc in services)
                {
                    var activePromo = await _servicePromotionRepository
                        .Query(p =>
                            p.TenantId == tenant.Id &&
                            p.ServiceId == svc.Id &&
                            p.IsActive &&
                            p.DaysOfWeek.Contains(todayDow) &&
                            (p.ValidFrom == null || p.ValidFrom <= today) &&
                            (p.ValidUntil == null || p.ValidUntil >= today))
                        .IgnoreQueryFilters()
                        .FirstOrDefaultAsync();

                    totalAmount += activePromo?.PromotionalPrice ?? svc.Price;
                    totalDuration += svc.DurationMinutes;
                }
            }
            else
            {
                // Múltiplos serviços sem IDs: usa os valores informados pelo frontend
                totalAmount = dto.TotalAmount ?? 0;
                totalDuration = dto.TotalDurationMinutes ?? 0;
            }

            var client = await clientRepository.GetByPhoneAsync(tenant.Id, dto.ClientPhone);
            if (client == null)
            {
                client = new Client
                {
                    TenantId = tenant.Id,
                    Name = dto.ClientName,
                    Phone = dto.ClientPhone,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                await clientRepository.AddAsync(client);
                await unitOfWork.CommitAsync();
            }

            // --- Idempotency check: return existing appointment if a duplicate arrives within 30 seconds ---
            var scheduledUtc = dto.ScheduledDateTime.ToUniversalTime();
            var deduplicationWindow = DateTimeOffset.UtcNow.AddSeconds(-30);
            var existingAppointment = await appointmentRepository
                .Query(a =>
                    a.TenantId == tenant.Id &&
                    a.ClientId == client.Id &&
                    a.EmployeeId == dto.EmployeeId &&
                    a.ScheduledDateTime == scheduledUtc &&
                    a.CreatedAt >= deduplicationWindow)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (existingAppointment != null)
                return new PublicBookingResponseDto(true, "Agendamento realizado com sucesso!", existingAppointment.Id);

            // ServiceId = primeiro serviço quando houver, null quando múltiplos (nomes vêm na Description)
            var primaryService = services.Count > 0 ? services[0] : null;

            var appointment = new Appointment
            {
                TenantId = tenant.Id,
                ClientId = client.Id,
                ServiceId = primaryService?.Id,
                EmployeeId = dto.EmployeeId,
                ScheduledDateTime = dto.ScheduledDateTime.ToUniversalTime(),
                DurationMinutes = totalDuration,
                Amount = totalAmount,
                Status = AppointmentStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow,
                Description = dto.Description,
                Notes = dto.Notes,
                ReminderMinutes = dto.ReminderMinutes,
                Source = dto.Source,
            };

            await appointmentRepository.AddAsync(appointment);
            await unitOfWork.CommitAsync();

            // Insert AppointmentServices join records
            foreach (var svc in services)
            {
                var appointmentService = new AppointmentServiceEntity
                {
                    AppointmentId = appointment.Id,
                    ServiceId = svc.Id,
                };
                await appointmentRepository.AddAppointmentServiceAsync(appointmentService);
            }
            await unitOfWork.CommitAsync();

            // Notify tenant owners about the new booking
            try
            {
                var ownerTenants = await _userTenantRepository.GetAllAsync(
                    ut => ut.TenantId == tenant.Id);

                var ownerIds = ownerTenants.Select(ut => ut.UserId).ToList();

                if (ownerIds.Count > 0)
                {
                    var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                    var dateStr = localTime.ToString("dd/MM/yyyy");
                    var timeStr = localTime.ToString("HH:mm");

                    var servicesSummary = services.Count > 0
                        ? (services.Count == 1 ? services[0].Name : string.Join(", ", services.Select(s => s.Name)))
                        : (dto.Description ?? "Múltiplos serviços");

                    await _expoPushNotificationService.SendToUsersAsync(
                        ownerIds,
                        "Novo Agendamento!",
                        $"{client.Name} agendou {servicesSummary} para {dateStr} às {timeStr}",
                        new { appointmentId = appointment.Id },
                        tenant.Id,
                        "new_appointment",
                        appointment.Id);
                }
            }
            catch (Exception)
            {
                // Do not fail the booking if push notifications fail
            }

            return new PublicBookingResponseDto(true, "Agendamento realizado com sucesso!", appointment.Id);
        }

        public async Task<IEnumerable<DTOs.CRM.AvailabilitySlotDto>> GetAvailableSlotsAsync(string tenantSlug, DateTime date, Guid? serviceId = null, Guid? employeeId = null, List<Guid>? serviceIds = null)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return [];

            // Resolve total service duration for conflict window calculation
            // serviceIds takes precedence over single serviceId
            int serviceDurationMinutes = 30;
            var effectiveServiceIds = (serviceIds != null && serviceIds.Count > 0)
                ? serviceIds
                : (serviceId.HasValue && serviceId.Value != Guid.Empty ? [serviceId.Value] : new List<Guid>());

            if (effectiveServiceIds.Count > 0)
            {
                int sumDuration = 0;
                Guid? firstValidId = null;
                foreach (var sid in effectiveServiceIds)
                {
                    var svc = await serviceRepository.GetPublicByIdAsync(tenant.Id, sid);
                    if (svc != null)
                    {
                        sumDuration += svc.DurationMinutes;
                        firstValidId ??= sid;
                    }
                }
                if (sumDuration > 0)
                    serviceDurationMinutes = sumDuration;

                // Use first valid serviceId for employee count query when no specific employeeId
                if (firstValidId.HasValue && (!serviceId.HasValue || serviceId.Value == Guid.Empty))
                    serviceId = firstValidId;
            }

            var nowBrasilia = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(-3));

            // Fetch configured business hours for this tenant and day
            var dayOfWeek = (int)date.DayOfWeek;
            var allHours = await businessHoursRepository.GetByTenantAsync(tenant.Id);
            var dayHours = allHours.FirstOrDefault(h => h.DayOfWeek == dayOfWeek);

            // Se o dia está marcado como fechado, retorna vazio
            if (dayHours != null && !dayHours.IsOpen)
                return [];

            // Build sorted ranges (or use default if none configured)
            var orderedRanges = dayHours?.Ranges.OrderBy(r => r.SortOrder).ToList() ?? [];
            if (orderedRanges.Count == 0)
                orderedRanges.Add(new TenantBusinessHoursRange { OpenTime = "08:00", CloseTime = "18:00" });

            static DateTimeOffset ParseRangeTime(DateTime d, string time, TimeSpan tz)
            {
                var parts = time.Split(':');
                return new DateTimeOffset(d.Year, d.Month, d.Day,
                    int.Parse(parts[0]), int.Parse(parts[1]), 0, tz);
            }

            var tz = TimeSpan.FromHours(-3);
            var firstRangeStart = ParseRangeTime(date, orderedRanges.First().OpenTime, tz);
            var lastRangeEnd    = ParseRangeTime(date, orderedRanges.Last().CloseTime, tz);

            // Full day window for appointment/block queries
            var dayStartUtc = firstRangeStart.ToUniversalTime();
            var dayEndUtc   = lastRangeEnd.ToUniversalTime();

            var query = appointmentRepository.Query(a =>
                a.TenantId == tenant.Id &&
                a.ScheduledDateTime >= dayStartUtc &&
                a.ScheduledDateTime < dayEndUtc &&
                a.Status != AppointmentStatus.Cancelled)
                .IgnoreQueryFilters();

            if (employeeId.HasValue && employeeId.Value != Guid.Empty)
                query = query.Where(a => a.EmployeeId == employeeId.Value);

            var appointments = await query.ToListAsync();

            var blocks = await _timeSlotBlockRepository
                .Query(b => b.TenantId == tenant.Id && b.StartDateTime < dayEndUtc && b.EndDateTime > dayStartUtc)
                .IgnoreQueryFilters()
                .ToListAsync();

            int activeEmployeesCount;
            if (employeeId.HasValue && employeeId.Value != Guid.Empty)
            {
                activeEmployeesCount = 1;
            }
            else if (serviceId.HasValue && serviceId.Value != Guid.Empty)
            {
                activeEmployeesCount = await employeeRepository.Query(e =>
                    e.TenantId == tenant.Id &&
                    e.IsActive &&
                    e.Specialties.Any(es => es.ServiceId == serviceId.Value))
                    .IgnoreQueryFilters()
                    .CountAsync();
            }
            else
            {
                activeEmployeesCount = await employeeRepository.Query(e => e.TenantId == tenant.Id && e.IsActive)
                    .IgnoreQueryFilters()
                    .CountAsync();
            }

            if (activeEmployeesCount <= 0 && (!employeeId.HasValue || employeeId.Value == Guid.Empty))
                activeEmployeesCount = 1;

            var slots = new List<DTOs.CRM.AvailabilitySlotDto>();

            // Generate slots per range (supports lunch break gaps)
            foreach (var range in orderedRanges)
            {
                var rangeStart = ParseRangeTime(date, range.OpenTime, tz);
                var rangeEnd   = ParseRangeTime(date, range.CloseTime, tz);

                // For today, skip past slots
                var effectiveStart = rangeStart;
                if (date.Date == nowBrasilia.Date && nowBrasilia > rangeStart)
                {
                    var minutesCeil = (int)Math.Ceiling(nowBrasilia.Minute / 30.0) * 30;
                    effectiveStart = new DateTimeOffset(date.Year, date.Month, date.Day, nowBrasilia.Hour, 0, 0, tz)
                        .AddMinutes(minutesCeil);
                    if (effectiveStart >= rangeEnd) continue;
                }

                var startUtc = rangeStart.ToUniversalTime();
                var endUtc   = rangeEnd.ToUniversalTime();
                var current  = effectiveStart.ToUniversalTime();

                while (current < endUtc)
                {
                    var next    = current.AddMinutes(30);
                    var slotEnd = current.AddMinutes(serviceDurationMinutes);

                    // Slot não cabe dentro do horário de funcionamento — encerra este range
                    if (slotEnd > endUtc)
                        break;

                    var overlappingBlock = blocks.FirstOrDefault(b => b.StartDateTime < next && b.EndDateTime > current);
                    if (overlappingBlock != null)
                    {
                        slots.Add(new DTOs.CRM.AvailabilitySlotDto(current, next, false, true, overlappingBlock.Reason));
                        current = next;
                        continue;
                    }

                    bool isBusy;
                    if (activeEmployeesCount <= 0)
                    {
                        isBusy = true;
                    }
                    else if (employeeId.HasValue && employeeId.Value != Guid.Empty)
                    {
                        isBusy = appointments.Any(a =>
                            current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                            slotEnd > a.ScheduledDateTime);
                    }
                    else
                    {
                        var overlappingCount = appointments.Count(a =>
                            current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                            slotEnd > a.ScheduledDateTime);
                        isBusy = overlappingCount >= activeEmployeesCount;
                    }

                    slots.Add(new DTOs.CRM.AvailabilitySlotDto(current, next, !isBusy));
                    current = next;
                }
            }

            return slots;
        }

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
