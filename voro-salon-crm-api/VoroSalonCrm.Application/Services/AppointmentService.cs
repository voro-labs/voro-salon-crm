using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class AppointmentService(
        IAppointmentRepository appointmentRepository,
        IServiceRecordService serviceRecordService,
        IEmployeeRepository employeeRepository,
        IServiceRepository serviceRepository,
        IClientMembershipRepository clientMembershipRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        ITenantRepository tenantRepository,
        IWhatsappService whatsappService,
        IUserTenantRepository userTenantRepository,
        IExpoPushNotificationService expoPushNotificationService,
        ITimeSlotBlockService timeSlotBlockService,
        ITenantBusinessHoursRepository businessHoursRepository,
        ITransactionRepository transactionRepository,
        IMemoryCache memoryCache) : IAppointmentService
    {
        private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;
        private readonly IServiceRecordService _serviceRecordService = serviceRecordService;
        private readonly IEmployeeRepository _employeeRepository = employeeRepository;
        private readonly IServiceRepository _serviceRepository = serviceRepository;
        private readonly IClientMembershipRepository _clientMembershipRepository = clientMembershipRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly ITenantRepository _tenantRepository = tenantRepository;
        private readonly IWhatsappService _whatsappService = whatsappService;
        private readonly IUserTenantRepository _userTenantRepository = userTenantRepository;
        private readonly IExpoPushNotificationService _expoPushNotificationService = expoPushNotificationService;
        private readonly ITimeSlotBlockService _timeSlotBlockService = timeSlotBlockService;
        private readonly ITenantBusinessHoursRepository _businessHoursRepository = businessHoursRepository;
        private readonly ITransactionRepository _transactionRepository = transactionRepository;
        private readonly IMemoryCache _memoryCache = memoryCache;

        public async Task<AppointmentDto> CreateAsync(CreateAppointmentDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var appointment = new Appointment
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ClientId = dto.ClientId,
                ServiceId = dto.ServiceId,
                ScheduledDateTime = dto.ScheduledDateTime,
                DurationMinutes = dto.DurationMinutes,
                Status = AppointmentStatus.Confirmed,
                Description = dto.Description,
                Amount = dto.Amount,
                Notes = dto.Notes,
                IsEncaixe = dto.IsEncaixe,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _appointmentRepository.AddAsync(appointment);
            await _unitOfWork.SaveChangesAsync();

            // Notifica os donos do tenant sobre o novo agendamento
            try
            {
                var ownerTenants = await _userTenantRepository.GetAllAsync(
                    ut => ut.TenantId == tenantId);

                var ownerIds = ownerTenants.Select(ut => ut.UserId).ToList();

                if (ownerIds.Count > 0)
                {
                    var fullAppointment = await _appointmentRepository.Include(a => a.Client, a => a.Service!)
                        .FirstOrDefaultAsync(a => a.Id == appointment.Id);

                    var clientName = fullAppointment?.Client?.Name ?? "Cliente";
                    var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                    var dateStr = localTime.ToString("dd/MM/yyyy");
                    var timeStr = localTime.ToString("HH:mm");

                    await _expoPushNotificationService.SendToUsersAsync(
                        ownerIds,
                        "Novo Agendamento",
                        $"{clientName} agendou para {dateStr} às {timeStr}",
                        new { appointmentId = appointment.Id, status = AppointmentStatus.Confirmed.ToString() },
                        tenantId,
                        "appointment_created",
                        appointment.Id);
                }
            }
            catch (Exception)
            {
                // Não falha o fluxo principal se a notificação falhar
            }

            return await GetByIdAsync(appointment.Id)
                ?? throw new Exception("Error retrieving created appointment.");
        }

        public async Task<AppointmentDto?> GetByIdAsync(Guid id)
        {
            var appointment = await _appointmentRepository.Include(a => a.Client, a => a.Service!)
                .Include(a => a.Employee!)
                .Include(a => a.Membership!)
                .ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

            if (appointment == null) return null;

            return MapToDto(appointment);
        }

        public async Task<IEnumerable<AppointmentDto>> GetAllAsync(Guid? clientId = null, Guid? employeeId = null)
        {
            var query = _appointmentRepository.Include(a => a.Client, a => a.Service!)
                .Include(a => a.Employee!)
                .Include(a => a.Membership!)
                .ThenInclude(m => m.Plan)
                .Where(a => !a.IsDeleted);

            if (clientId.HasValue)
                query = query.Where(a => a.ClientId == clientId.Value);

            if (employeeId.HasValue)
                query = query.Where(a => a.EmployeeId == employeeId.Value);

            var appointments = await query.OrderBy(a => a.ScheduledDateTime).ToListAsync();
            return appointments.Select(MapToDto);
        }

        public async Task<AppointmentDto> UpdateAsync(Guid id, UpdateAppointmentDto dto)
        {
            var appointment = await _appointmentRepository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException($"Appointment '{id}' not found.");

            var oldDateTime = appointment.ScheduledDateTime;
            var oldStatus = appointment.Status;

            if (dto.ClientId.HasValue) appointment.ClientId = dto.ClientId.Value;
            if (dto.ServiceId.HasValue) appointment.ServiceId = dto.ServiceId.Value;
            appointment.EmployeeId = dto.EmployeeId; // null = sem funcionário, GUID = funcionário selecionado
            if (dto.ScheduledDateTime.HasValue) appointment.ScheduledDateTime = dto.ScheduledDateTime.Value;
            if (dto.DurationMinutes.HasValue) appointment.DurationMinutes = dto.DurationMinutes.Value;
            if (dto.Status.HasValue) appointment.Status = dto.Status.Value;
            if (dto.Description != null) appointment.Description = dto.Description;
            if (dto.Amount.HasValue) appointment.Amount = dto.Amount.Value;
            if (dto.Notes != null) appointment.Notes = dto.Notes;
            if (dto.IsEncaixe.HasValue) appointment.IsEncaixe = dto.IsEncaixe.Value;

            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            _appointmentRepository.Update(appointment);

            // Se mudou para concluído agora, gera o histórico
            if (oldStatus != AppointmentStatus.Completed && appointment.Status == AppointmentStatus.Completed)
            {
                await CreateHistoryFromAppointmentAsync(appointment);
            }
            // Se saiu de concluído para cancelado/pendente, remove o histórico e reverte comissão/sessão
            else if (oldStatus == AppointmentStatus.Completed &&
                (appointment.Status == AppointmentStatus.Pending || appointment.Status == AppointmentStatus.Cancelled))
            {
                await _serviceRecordService.DeleteByAppointmentIdAsync(appointment.Id);
                await ReverseCompletionAsync(appointment);
            }

            await _unitOfWork.SaveChangesAsync();

            // Se mudou data/hora, notifica o reagendamento (se bot ativo)
            if (dto.ScheduledDateTime.HasValue && dto.ScheduledDateTime.Value != oldDateTime)
            {
                try
                {
                    await NotifyReschedulingAsync(appointment);
                }
                catch (Exception) { /* Ignora falha na notificação */ }
            }

            return await GetByIdAsync(id)
                ?? throw new Exception("Error retrieving updated appointment.");
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var appointment = await _appointmentRepository.GetByIdAsync(false, id);
            if (appointment == null) return false;

            appointment.IsDeleted = true;
            appointment.DeletedAt = DateTimeOffset.UtcNow;

            _appointmentRepository.Update(appointment);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        public async Task<bool> UpdateStatusAsync(Guid id, AppointmentStatus status)
        {
            var appointment = await _appointmentRepository.Include(a => a.Client, a => a.Service!)
                .FirstOrDefaultAsync(a => a.Id == id && !a.IsDeleted);

            if (appointment == null) return false;

            var oldStatus = appointment.Status;
            appointment.Status = status;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            _appointmentRepository.Update(appointment);

            if (oldStatus != AppointmentStatus.Completed && appointment.Status == AppointmentStatus.Completed)
            {
                await CreateHistoryFromAppointmentAsync(appointment);
                await DecrementMembershipSessionAsync(appointment);
            }
            else if (oldStatus == AppointmentStatus.Completed &&
                (appointment.Status == AppointmentStatus.Pending || appointment.Status == AppointmentStatus.Cancelled))
            {
                await _serviceRecordService.DeleteByAppointmentIdAsync(appointment.Id);
                await ReverseCompletionAsync(appointment);
            }

            await _unitOfWork.SaveChangesAsync();

            // Send push notifications to tenant owners
            if (oldStatus != status && (status == AppointmentStatus.Confirmed || status == AppointmentStatus.Cancelled || status == AppointmentStatus.Completed))
            {
                try
                {
                    var ownerTenants = await _userTenantRepository.GetAllAsync(
                        ut => ut.TenantId == appointment.TenantId);

                    var ownerIds = ownerTenants.Select(ut => ut.UserId).ToList();

                    if (ownerIds.Count > 0)
                    {
                        var clientName = appointment.Client?.Name ?? "Cliente";
                        var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                        var dateStr = localTime.ToString("dd/MM/yyyy");
                        var timeStr = localTime.ToString("HH:mm");

                        string pushTitle;
                        string pushBody;
                        string notificationType;

                        if (status == AppointmentStatus.Confirmed)
                        {
                            pushTitle = "Agendamento Confirmado";
                            pushBody = $"O agendamento de {clientName} foi confirmado para {dateStr} às {timeStr}";
                            notificationType = "status_changed_confirmed";
                        }
                        else if (status == AppointmentStatus.Cancelled)
                        {
                            pushTitle = "Agendamento Cancelado";
                            pushBody = $"O agendamento de {clientName} para {dateStr} às {timeStr} foi cancelado";
                            notificationType = "status_changed_cancelled";
                        }
                        else // Completed
                        {
                            pushTitle = "Atendimento Concluído";
                            pushBody = $"{clientName} foi atendido(a)";
                            notificationType = "status_changed_completed";
                        }

                        await _expoPushNotificationService.SendToUsersAsync(
                            ownerIds,
                            pushTitle,
                            pushBody,
                            new { appointmentId = appointment.Id, status = status.ToString() },
                            appointment.TenantId,
                            notificationType,
                            appointment.Id);
                    }
                }
                catch (Exception)
                {
                    // Do not fail the main flow if push notifications fail
                }
            }

            // Send WhatsApp notifications
            if (oldStatus != status && appointment.Client != null && !string.IsNullOrWhiteSpace(appointment.Client.Phone))
            {
                var tenant = await _tenantRepository.GetByIdAsync(false, appointment.TenantId);
                if (tenant == null || !tenant.UseWhatsappBooking) return true;

                // Anti-spam: skip if the same status notification was already sent within 5 minutes
                var cacheKey = $"wa_status_{appointment.Id}_{status}";
                if (_memoryCache.TryGetValue(cacheKey, out _)) return true;

                var tenantName = tenant.Name;
                var phone = appointment.Client.Phone;

                var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));

                if (status == AppointmentStatus.Confirmed)
                {
                    var templateMsg = new WhatsappTemplateMessageDto
                    {
                        To = phone,
                        Template = new() {
                            Name = "appointment_confirmation_1",
                            Components =
                            [
                                new() {
                                    Type = "body",
                                    Parameters =
                                    [
                                        new() { Type = "text", Text = appointment.Client.Name },
                                        new() { Type = "text", Text = tenantName },
                                        new() { Type = "text", Text = appointment.Service?.Name ?? "Serviço" },
                                        new() { Type = "text", Text = localTime.ToString("dd/MM/yyyy") },
                                        new() { Type = "text", Text = localTime.ToString("HH:mm") }
                                    ]
                                },
                                new() {
                                    Type = "button",
                                    SubType = "url",
                                    Index = "0",
                                    Parameters = [
                                        new() { Type = "text", Text = appointment.Id.ToString() }
                                    ]
                                }
                            ]
                        }
                    };

                    await _whatsappService.SendTemplateMessageAsync(templateMsg, tenant?.WhatsappPhoneNumberId);
                    _memoryCache.Set(cacheKey, true, TimeSpan.FromMinutes(5));
                }
                else if (status == AppointmentStatus.Cancelled)
                {
                    var templateMsg = new WhatsappTemplateMessageDto
                    {
                        To = phone,
                        Template = new() {
                            Name = "appointment_cancellation_1",
                            Components =
                            [
                                new() {
                                    Type = "body",
                                    Parameters =
                                    [
                                        new() { Type = "text", Text = appointment.Client.Name },
                                        new() { Type = "text", Text = tenantName },
                                        new() { Type = "text", Text = localTime.ToString("dd/MM/yyyy") },
                                        new() { Type = "text", Text = localTime.ToString("HH:mm") }
                                    ]
                                },
                                new() {
                                    Type = "button",
                                    SubType = "url",
                                    Index = "0",
                                    Parameters = [
                                        new() { Type = "text", Text = appointment.Id.ToString() }
                                    ]
                                }
                            ]
                        }
                    };

                    await _whatsappService.SendTemplateMessageAsync(templateMsg, tenant?.WhatsappPhoneNumberId);
                    _memoryCache.Set(cacheKey, true, TimeSpan.FromMinutes(5));
                }
                else if (status == AppointmentStatus.Completed && appointment.Client != null &&
                    !string.IsNullOrWhiteSpace(appointment.Client.Phone))
                {
                    // Send rating request template after completion
                    var ratingMsg = new WhatsappTemplateMessageDto
                    {
                        To = appointment.Client.Phone,
                        Template = new()
                        {
                            Name = "service_rating_request_1",
                            Components =
                            [
                                new() {
                                    Type = "body",
                                    Parameters =
                                    [
                                        new() { Type = "text", Text = appointment.Client.Name },
                                        new() { Type = "text", Text = appointment.Service?.Name ?? "Serviço" }
                                    ]
                                },
                                new() {
                                    Type = "button",
                                    SubType = "url",
                                    Index = "0",
                                    Parameters = [
                                        new() { Type = "text", Text = "/" + appointment.Id.ToString() }
                                    ]
                                }
                            ]
                        }
                    };

                    try
                    {
                        await _whatsappService.SendTemplateMessageAsync(ratingMsg, tenant?.WhatsappPhoneNumberId);
                    }
                    catch (Exception) { /* Não falha o fluxo se o envio falhar */ }
                }
            }

            return true;
        }

        public async Task<bool> NotifyReschedulingAsync(Appointment appointment)
        {
            if (appointment.Client == null) return false;

            var tenant = await _tenantRepository.GetByIdAsync(false, appointment.TenantId);
            if (tenant == null || !tenant.UseWhatsappBooking) return false;

            var tenantName = tenant.Name;
            var phone = appointment.Client.Phone;
            if (string.IsNullOrWhiteSpace(phone)) return false;

            var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));

            var templateMsg = new WhatsappTemplateMessageDto
            {
                To = phone,
                Template = new()
                {
                    Name = "appointment_reminder_2",
                    Components =
                    [
                        new() {
                            Type = "body",
                            Parameters =
                            [
                                new() { Type = "text", Text = appointment.Client.Name },
                                new() { Type = "text", Text = tenantName },
                                new() { Type = "text", Text = appointment.Service?.Name ?? "Serviço" },
                                new() { Type = "text", Text = localTime.ToString("dd/MM/yyyy") },
                                new() { Type = "text", Text = localTime.ToString("HH:mm") }
                            ]
                        },
                        new() {
                            Type = "button",
                            SubType = "url",
                            Index = "0",
                            Parameters = [
                                new() { Type = "text", Text = appointment.Id.ToString() }
                            ]
                        }
                    ]
                }
            };

            await _whatsappService.SendTemplateMessageAsync(templateMsg, tenant?.WhatsappPhoneNumberId);
            return true;
        }

        public async Task<IEnumerable<AvailabilitySlotDto>> GetAvailableSlotsAsync(DateTime date, Guid? serviceId = null, Guid? employeeId = null)
        {
            var tenantId = _currentUserService.TenantId;

            // Resolve business hours from tenant settings
            var dayOfWeek = (int)date.DayOfWeek;
            var allHours = await _businessHoursRepository.GetByTenantAsync(tenantId);
            var dayHours = allHours.FirstOrDefault(h => h.DayOfWeek == dayOfWeek);

            // If the day is explicitly closed, return empty
            if (dayHours != null && !dayHours.IsOpen)
                return [];

            var openTimeParts = (dayHours?.OpenTime ?? "08:00").Split(':');
            var closeTimeParts = (dayHours?.CloseTime ?? "18:00").Split(':');
            int openHour = int.Parse(openTimeParts[0]);
            int openMin = int.Parse(openTimeParts[1]);
            int closeHour = int.Parse(closeTimeParts[0]);
            int closeMin = int.Parse(closeTimeParts[1]);

            var startOfDay = new DateTimeOffset(date.Year, date.Month, date.Day, openHour, openMin, 0, TimeSpan.FromHours(-3));
            var endOfDay = new DateTimeOffset(date.Year, date.Month, date.Day, closeHour, closeMin, 0, TimeSpan.FromHours(-3));

            var startUtc = startOfDay.ToUniversalTime();
            var endUtc = endOfDay.ToUniversalTime();

            // Resolve service duration to properly check if a new booking fits without conflict
            var serviceDurationMinutes = 30;
            if (serviceId.HasValue && serviceId.Value != Guid.Empty)
            {
                var service = await _serviceRepository.GetByIdAsync(true, serviceId.Value);
                if (service != null)
                    serviceDurationMinutes = service.DurationMinutes;
            }

            var query = _appointmentRepository.Query(a =>
                a.TenantId == tenantId &&
                a.ScheduledDateTime >= startUtc &&
                a.ScheduledDateTime < endUtc &&
                !a.IsDeleted &&
                a.Status != AppointmentStatus.Cancelled);

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
                activeEmployeesCount = await _employeeRepository.Query(e =>
                    e.TenantId == tenantId &&
                    e.IsActive &&
                    e.Specialties.Any(es => es.ServiceId == serviceId.Value))
                    .CountAsync();
            }
            else
            {
                activeEmployeesCount = await _employeeRepository
                    .Query(e => e.TenantId == tenantId && e.IsActive)
                    .CountAsync();
            }

            // Load time blocks for this day
            var blocks = (await _timeSlotBlockService.GetOverlappingAsync(startUtc, endUtc)).ToList();

            var slots = new List<AvailabilitySlotDto>();
            var current = startOfDay.ToUniversalTime();

            // Salon-only Mode: If no active employees exist, treat the salon as a single resource with capacity 1
            if (activeEmployeesCount <= 0 && (!employeeId.HasValue || employeeId.Value == Guid.Empty))
            {
                activeEmployeesCount = 1;
            }

            while (current < endUtc)
            {
                var next = current.AddMinutes(30); // iteration step
                var slotEnd = current.AddMinutes(serviceDurationMinutes); // actual end for conflict check

                // Check if slot is blocked
                var overlappingBlock = blocks.FirstOrDefault(b => b.StartDateTime < next && b.EndDateTime > current);
                if (overlappingBlock != null)
                {
                    slots.Add(new AvailabilitySlotDto(current, next, false, true, overlappingBlock.Reason));
                    current = next;
                    continue;
                }

                // A slot is unavailable if the full service duration extends beyond end of day
                if (slotEnd > endUtc)
                {
                    slots.Add(new AvailabilitySlotDto(current, next, false));
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
                    // For specific professional: check if the full service window overlaps any existing appointment
                    isBusy = appointments.Any(a =>
                        current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                        slotEnd > a.ScheduledDateTime);
                }
                else
                {
                    // For "Any professional" or Salon-only mode, busy only if ALL capacity is occupied
                    var overlappingCount = appointments.Count(a =>
                        current < a.ScheduledDateTime.AddMinutes(a.DurationMinutes) &&
                        slotEnd > a.ScheduledDateTime);

                    isBusy = overlappingCount >= activeEmployeesCount;
                }

                slots.Add(new AvailabilitySlotDto(current, next, !isBusy));
                current = next;
            }

            return slots;
        }

        private async Task ReverseCompletionAsync(Appointment appointment)
        {
            // Revert membership session if one was decremented
            if (appointment.ClientMembershipId.HasValue)
            {
                var membership = await _clientMembershipRepository
                    .GetByIdAsync(false, appointment.ClientMembershipId.Value);

                if (membership != null && membership.RemainingSessions != null)
                {
                    membership.RemainingSessions += 1;
                    if (membership.Status == ClientMembershipStatus.Expired && membership.RemainingSessions > 0)
                        membership.Status = ClientMembershipStatus.Active;
                    membership.UpdatedAt = DateTimeOffset.UtcNow;
                    _clientMembershipRepository.Update(membership);
                }

                appointment.ClientMembershipId = null;
                _appointmentRepository.Update(appointment);
            }

            // Delete the commission transaction generated on completion
            if (appointment.EmployeeId.HasValue)
            {
                var appointmentIdStr = appointment.Id.ToString();
                var commissions = await _transactionRepository
                    .Query(t => t.TenantId == appointment.TenantId
                        && t.EmployeeId == appointment.EmployeeId
                        && t.Notes != null && t.Notes.Contains(appointmentIdStr)
                        && t.Type == TransactionType.Expense)
                    .ToListAsync();

                _transactionRepository.DeleteRange(commissions);
            }
        }

        private async Task DecrementMembershipSessionAsync(Appointment appointment)
        {
            var activeMemberships = await _clientMembershipRepository
                .Query(m => m.ClientId == appointment.ClientId && m.TenantId == appointment.TenantId
                    && m.Status == ClientMembershipStatus.Active
                    && m.EndDate >= DateTimeOffset.UtcNow)
                .Include(m => m.Plan)
                .OrderBy(m => m.EndDate)
                .ToListAsync();

            var membership = activeMemberships.FirstOrDefault();
            if (membership == null) return;

            // Vincula a assinatura ao agendamento
            appointment.ClientMembershipId = membership.Id;
            _appointmentRepository.Update(appointment);

            if (membership.RemainingSessions == null) return; // sessões ilimitadas

            membership.RemainingSessions = Math.Max(0, membership.RemainingSessions.Value - 1);
            membership.UpdatedAt = DateTimeOffset.UtcNow;

            if (membership.RemainingSessions == 0)
                membership.Status = ClientMembershipStatus.Expired;

            _clientMembershipRepository.Update(membership);
        }

        private async Task CreateHistoryFromAppointmentAsync(Appointment appointment)
        {
            var historyDto = new CreateServiceRecordDto(
                appointment.ClientId,
                appointment.ServiceId,
                appointment.Id,
                DateTimeOffset.UtcNow,
                appointment.Description ?? "Serviço via agendamento",
                appointment.Amount,
                $"Agendamento ID: {appointment.Id}\nNotas: {appointment.Notes}"
            );

            await _serviceRecordService.CreateAsync(historyDto);

            // Gera comissão automaticamente se o funcionário tiver percentual configurado
            if (appointment.EmployeeId.HasValue && appointment.Amount > 0)
            {
                var employee = await _employeeRepository.GetByIdAsync(true, appointment.EmployeeId.Value);
                if (employee?.CommissionPercentage is > 0)
                {
                    var commissionAmount = Math.Round(appointment.Amount * (employee.CommissionPercentage.Value / 100m), 2);
                    var dueDate = new DateTimeOffset(
                        appointment.ScheduledDateTime.Year,
                        appointment.ScheduledDateTime.Month,
                        DateTime.DaysInMonth(appointment.ScheduledDateTime.Year, appointment.ScheduledDateTime.Month),
                        23, 59, 59, TimeSpan.Zero);

                    var commissionTx = new Transaction
                    {
                        Id = Guid.NewGuid(),
                        TenantId = appointment.TenantId,
                        Description = $"Comissão – {employee.Name} – {appointment.Service?.Name ?? "Serviço"}",
                        Amount = commissionAmount,
                        PaidAmount = 0,
                        DueDate = dueDate,
                        Type = TransactionType.Expense,
                        PaymentMethod = PaymentMethod.Other,
                        Status = TransactionStatus.Pending,
                        EmployeeId = employee.Id,
                        Notes = $"Comissão de {employee.CommissionPercentage}% sobre agendamento {appointment.Id}",
                        CreatedAt = DateTimeOffset.UtcNow
                    };

                    await _transactionRepository.AddAsync(commissionTx);
                }
            }
        }

        private static AppointmentDto MapToDto(Appointment a)
        {
            return new AppointmentDto(
                a.Id,
                a.ClientId,
                a.Client?.Name ?? "Unknown",
                a.Client?.Phone,
                a.ServiceId,
                a.Service?.Name,
                a.ScheduledDateTime,
                a.DurationMinutes,
                a.Status,
                a.Description,
                a.Amount,
                a.Notes,
                a.CreatedAt,
                a.IsEncaixe,
                a.ClientMembershipId,
                a.Membership?.Plan?.Name,
                a.Membership?.RemainingSessions,
                a.EmployeeId,
                a.Employee?.Name
            );
        }
    }
}
