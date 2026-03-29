using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class TimeSlotBlockService(
        ITimeSlotBlockRepository repository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IAppointmentRepository appointmentRepository,
        ITenantRepository tenantRepository,
        IWhatsappService whatsappService) : ITimeSlotBlockService
    {
        private readonly ITimeSlotBlockRepository _repository = repository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;

        public async Task<IEnumerable<TimeSlotBlockDto>> GetAllAsync()
        {
            var blocks = await _repository.Query(_ => true).OrderBy(b => b.StartDateTime).ToListAsync();
            return blocks.Select(b => MapToDto(b, 0));
        }

        public async Task<TimeSlotBlockDto> CreateAsync(CreateTimeSlotBlockDto dto)
        {
            if (dto.EndDateTime <= dto.StartDateTime)
                throw new ArgumentException("EndDateTime must be after StartDateTime.");

            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            // Busca agendamentos que se sobrepõem ao bloqueio, antes de salvar
            var overlapping = await appointmentRepository
                .Query(a =>
                    a.Status != AppointmentStatus.Cancelled &&
                    a.Status != AppointmentStatus.Completed &&
                    a.ScheduledDateTime < dto.EndDateTime &&
                    a.ScheduledDateTime.AddMinutes(a.DurationMinutes) > dto.StartDateTime)
                .Include(a => a.Client)
                .Include(a => a.Service)
                .ToListAsync();

            // Cancela os agendamentos afetados
            foreach (var appointment in overlapping)
                appointment.Status = AppointmentStatus.Cancelled;

            if (overlapping.Count > 0)
                appointmentRepository.UpdateRange(overlapping);

            // Cria o bloco
            var block = new TimeSlotBlock
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                StartDateTime = dto.StartDateTime,
                EndDateTime = dto.EndDateTime,
                Reason = dto.Reason,
                ClientMessage = dto.ClientMessage,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _repository.AddAsync(block);
            await _unitOfWork.SaveChangesAsync();

            // Envia notificações WhatsApp para os clientes afetados (após salvar)
            int notifiedCount = 0;
            var tenant = await tenantRepository.GetByIdAsync(false, tenantId);

            if (tenant?.UseWhatsappBooking == true && !string.IsNullOrEmpty(tenant.WhatsappPhoneNumberId))
            {
                foreach (var appointment in overlapping.Where(a => !string.IsNullOrEmpty(a.Client?.Phone)))
                {
                    var reason = string.IsNullOrWhiteSpace(dto.Reason) ? "não informado" : dto.Reason;
                    var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                    var serviceName = appointment.Service?.Name;

                    var text = $"Olá, {appointment.Client!.Name}! 😔\n\n" +
                               $"Infelizmente precisamos cancelar seu agendamento:\n" +
                               $"📅 {localTime:dd/MM/yyyy} às {localTime:HH:mm}";

                    if (!string.IsNullOrEmpty(serviceName))
                        text += $"\n✂️ {serviceName}";

                    text += $"\n\n*Motivo:* {reason}\n\n" +
                            $"Pedimos desculpas pelo inconveniente. Entre em contato para reagendar! 🙏";

                    var phone = appointment.Client.Phone!.TrimStart('+');

                    try
                    {
                        var sent = await whatsappService.SendTextMessageAsync(phone, text, tenant.WhatsappPhoneNumberId);
                        if (sent) notifiedCount++;
                    }
                    catch
                    {
                        // Não falha o fluxo se o WhatsApp falhar
                    }
                }
            }

            return MapToDto(block, notifiedCount);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var block = await _repository.GetByIdAsync(false, id);
            if (block == null) return false;

            _repository.Delete(block);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<TimeSlotBlockDto>> GetOverlappingAsync(DateTimeOffset start, DateTimeOffset end)
        {
            var blocks = await _repository.Query(b =>
                b.StartDateTime < end && b.EndDateTime > start)
                .ToListAsync();
            return blocks.Select(b => MapToDto(b, 0));
        }

        private static TimeSlotBlockDto MapToDto(TimeSlotBlock b, int notifiedCount) =>
            new(b.Id, b.StartDateTime, b.EndDateTime, b.Reason, b.ClientMessage, b.CreatedAt, notifiedCount);
    }
}
