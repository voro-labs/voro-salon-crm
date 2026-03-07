using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class PublicBookingService(
        ITenantRepository tenantRepository,
        IClientRepository clientRepository,
        IServiceRepository serviceRepository,
        IEmployeeRepository employeeRepository,
        IAppointmentRepository appointmentRepository,
        IUnitOfWork unitOfWork) : IPublicBookingService
    {
        public async Task<PublicTenantDto?> GetTenantBySlugAsync(string slug)
        {
            var tenant = await tenantRepository.GetBySlugAsync(slug);
            if (tenant == null) return null;

            return new PublicTenantDto(
                tenant.Id,
                tenant.Name,
                tenant.Slug,
                tenant.ContactPhone,
                tenant.LogoUrl,
                tenant.PrimaryColor,
                tenant.SecondaryColor,
                tenant.ThemeMode?.ToString()
            );
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

            var services = await serviceRepository.GetPublicActiveByTenantAsync(tenant.Id);

            return services.Select(s => new PublicServiceDto(s.Id, s.Name, s.Price, 30)); // TODO: Add Duration to Service entity if needed, using 30 default for now manually if it doesn't match
        }

        public async Task<IEnumerable<PublicEmployeeDto>> GetEmployeesByServiceAsync(string tenantSlug, Guid serviceId)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return Enumerable.Empty<PublicEmployeeDto>();

            var employees = await employeeRepository.GetPublicEmployeesByServiceAsync(tenant.Id, serviceId);

            return employees.Select(e => new PublicEmployeeDto(e.Id, e.Name, e.PhotoUrl));
        }

        public async Task<PublicBookingResponseDto> CreateBookingAsync(PublicBookingCreateDto dto)
        {
            var tenant = await tenantRepository.GetBySlugAsync(dto.TenantSlug);
            if (tenant == null) return new PublicBookingResponseDto(false, "Estabelecimento não encontrado.", null);

            var service = await serviceRepository.GetPublicByIdAsync(tenant.Id, dto.ServiceId);

            if (service == null) return new PublicBookingResponseDto(false, "Serviço não encontrado.", null);

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

            var appointment = new Appointment
            {
                TenantId = tenant.Id,
                ClientId = client.Id,
                ServiceId = dto.ServiceId,
                EmployeeId = dto.EmployeeId,
                ScheduledDateTime = dto.ScheduledDateTime.ToUniversalTime(),
                DurationMinutes = 30, // Default duration
                Amount = service.Price,
                Status = AppointmentStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow,
                Description = dto.Description
            };

            await appointmentRepository.AddAsync(appointment);
            await unitOfWork.CommitAsync();

            return new PublicBookingResponseDto(true, "Agendamento realizado com sucesso!", appointment.Id);
        }

        public async Task<IEnumerable<VoroSalonCrm.Application.DTOs.CRM.AvailabilitySlotDto>> GetAvailableSlotsAsync(string tenantSlug, DateTime date, Guid? serviceId = null, Guid? employeeId = null)
        {
            var tenant = await tenantRepository.GetBySlugAsync(tenantSlug);
            if (tenant == null) return [];

            var startOfDay = new DateTimeOffset(date.Year, date.Month, date.Day, 8, 0, 0, TimeSpan.FromHours(-3));
            var endOfDay = new DateTimeOffset(date.Year, date.Month, date.Day, 18, 0, 0, TimeSpan.FromHours(-3));

            var startUtc = startOfDay.ToUniversalTime();
            var endUtc = endOfDay.ToUniversalTime();

            var query = appointmentRepository.Query(a =>
                a.TenantId == tenant.Id &&
                a.ScheduledDateTime >= startUtc &&
                a.ScheduledDateTime < endUtc &&
                a.Status != AppointmentStatus.Cancelled)
                .IgnoreQueryFilters();

            if (employeeId.HasValue && employeeId.Value != Guid.Empty)
            {
                query = query.Where(a => a.EmployeeId == employeeId.Value);
            }

            var appointments = await query.ToListAsync();

            // Get total active employees to handle "Any professional" case
            int activeEmployeesCount;

            if (employeeId.HasValue && employeeId.Value != Guid.Empty)
            {
                activeEmployeesCount = 1;
            }
            else if (serviceId.HasValue && serviceId.Value != Guid.Empty)
            {
                // Count employees who provide this service
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

            var slots = new List<VoroSalonCrm.Application.DTOs.CRM.AvailabilitySlotDto>();
            var current = startOfDay.ToUniversalTime();

            // Salon-only Mode: If no active employees exist, treat the salon as a single resource with capacity 1
            if (activeEmployeesCount <= 0 && (!employeeId.HasValue || employeeId.Value == Guid.Empty))
            {
                activeEmployeesCount = 1;
            }

            while (current < endOfDay)
            {
                var next = current.AddMinutes(30).ToUniversalTime();

                bool isBusy;
                if (activeEmployeesCount <= 0)
                {
                    // This case only happens if a SPECIFIC employee was requested but they are inactive/non-existent
                    isBusy = true;
                }
                else if (employeeId.HasValue && employeeId.Value != Guid.Empty)
                {
                    // For specific professional
                    isBusy = appointments.Any(a =>
                        current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                        next > a.ScheduledDateTime);
                }
                else
                {
                    // For "Any professional" or Salon-only mode, busy only if ALL (or the default 1) capacity is occupied
                    var overlappingCount = appointments.Count(a =>
                        current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                        next > a.ScheduledDateTime);

                    isBusy = overlappingCount >= activeEmployeesCount;
                }

                slots.Add(new VoroSalonCrm.Application.DTOs.CRM.AvailabilitySlotDto(current.ToUniversalTime(), next.ToUniversalTime(), !isBusy));
                current = next.ToUniversalTime();
            }

            return slots;
        }
    }
}
