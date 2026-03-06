using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class AppointmentService(
        IAppointmentRepository appointmentRepository,
        IServiceRecordService serviceRecordService,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService) : IAppointmentService
    {
        private readonly IAppointmentRepository _appointmentRepository = appointmentRepository;
        private readonly IServiceRecordService _serviceRecordService = serviceRecordService;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;

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
                Status = AppointmentStatus.Pending,
                Description = dto.Description,
                Amount = dto.Amount,
                Notes = dto.Notes,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _appointmentRepository.AddAsync(appointment);
            await _unitOfWork.SaveChangesAsync();

            return await GetByIdAsync(appointment.Id)
                ?? throw new Exception("Error retrieving created appointment.");
        }

        public async Task<AppointmentDto?> GetByIdAsync(Guid id)
        {
            var appointment = await _appointmentRepository.Include(a => a.Client, a => a.Service!)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (appointment == null) return null;

            return MapToDto(appointment);
        }

        public async Task<IEnumerable<AppointmentDto>> GetAllAsync(Guid? clientId = null)
        {
            var query = _appointmentRepository.Include(a => a.Client, a => a.Service!);

            if (clientId.HasValue)
                query = query.Where(a => a.ClientId == clientId.Value);

            var appointments = await query.OrderBy(a => a.ScheduledDateTime).ToListAsync();
            return appointments.Select(MapToDto);
        }

        public async Task<AppointmentDto> UpdateAsync(Guid id, UpdateAppointmentDto dto)
        {
            var appointment = await _appointmentRepository.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Appointment '{id}' not found.");

            var oldStatus = appointment.Status;

            if (dto.ClientId.HasValue) appointment.ClientId = dto.ClientId.Value;
            if (dto.ServiceId.HasValue) appointment.ServiceId = dto.ServiceId;
            if (dto.ScheduledDateTime.HasValue) appointment.ScheduledDateTime = dto.ScheduledDateTime.Value;
            if (dto.DurationMinutes.HasValue) appointment.DurationMinutes = dto.DurationMinutes.Value;
            if (dto.Status.HasValue) appointment.Status = dto.Status.Value;
            if (dto.Description != null) appointment.Description = dto.Description;
            if (dto.Amount.HasValue) appointment.Amount = dto.Amount.Value;
            if (dto.Notes != null) appointment.Notes = dto.Notes;

            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            _appointmentRepository.Update(appointment);

            // Se mudou para concluído agora, gera o histórico
            if (oldStatus != AppointmentStatus.Completed && appointment.Status == AppointmentStatus.Completed)
            {
                await CreateHistoryFromAppointmentAsync(appointment);
            }

            await _unitOfWork.SaveChangesAsync();

            return await GetByIdAsync(id)
                ?? throw new Exception("Error retrieving updated appointment.");
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var appointment = await _appointmentRepository.GetByIdAsync(id);
            if (appointment == null) return false;

            appointment.IsDeleted = true;
            appointment.DeletedAt = DateTimeOffset.UtcNow;

            _appointmentRepository.Update(appointment);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        public async Task<bool> UpdateStatusAsync(Guid id, AppointmentStatus status)
        {
            var appointment = await _appointmentRepository.GetByIdAsync(id);
            if (appointment == null) return false;

            var oldStatus = appointment.Status;
            appointment.Status = status;
            appointment.UpdatedAt = DateTimeOffset.UtcNow;

            _appointmentRepository.Update(appointment);

            // Se mudou para concluído agora, gera o histórico
            if (oldStatus != AppointmentStatus.Completed && appointment.Status == AppointmentStatus.Completed)
            {
                await CreateHistoryFromAppointmentAsync(appointment);
            }

            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        private async Task CreateHistoryFromAppointmentAsync(Appointment appointment)
        {
            var historyDto = new CreateServiceRecordDto(
                appointment.ClientId,
                appointment.ServiceId,
                DateTimeOffset.UtcNow,
                appointment.Description ?? "Serviço via agendamento",
                appointment.Amount,
                $"Agendamento ID: {appointment.Id}\nNotas: {appointment.Notes}"
            );

            await _serviceRecordService.CreateAsync(historyDto);
        }

        private static AppointmentDto MapToDto(Appointment a)
        {
            return new AppointmentDto(
                a.Id,
                a.ClientId,
                a.Client?.Name ?? "Unknown",
                a.ServiceId,
                a.Service?.Name,
                a.ScheduledDateTime,
                a.DurationMinutes,
                a.Status,
                a.Description,
                a.Amount,
                a.Notes,
                a.CreatedAt
            );
        }
    }
}
