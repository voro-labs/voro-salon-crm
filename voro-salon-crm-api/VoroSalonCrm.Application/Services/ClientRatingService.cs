using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ClientRatingService(
        IClientRatingRepository ratingRepository,
        IAppointmentRepository appointmentRepository,
        ITenantRepository tenantRepository,
        IWhatsappService whatsappService,
        IUnitOfWork unitOfWork) : IClientRatingService
    {
        public async Task<ClientRatingDto> SubmitAsync(Guid appointmentId, SubmitRatingDto dto)
        {
            if (dto.Stars < 1 || dto.Stars > 5)
                throw new ArgumentException("Stars must be between 1 and 5.");

            // Load the appointment (bypass tenant filter — public context)
            var appointment = await appointmentRepository
                .Query(a => a.Id == appointmentId)
                .Include(a => a.Client)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Appointment not found.");

            // Prevent double rating
            var existing = await ratingRepository
                .Query(r => r.AppointmentId == appointmentId)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (existing != null)
                throw new InvalidOperationException("This appointment has already been rated.");

            var rating = new ClientRating
            {
                Id = Guid.NewGuid(),
                TenantId = appointment.TenantId,
                AppointmentId = appointmentId,
                ClientId = appointment.ClientId,
                Stars = dto.Stars,
                Comment = dto.Comment,
                Source = dto.Source,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await ratingRepository.AddAsync(rating);
            await unitOfWork.SaveChangesAsync();

            rating.Client = appointment.Client;
            return MapToDto(rating);
        }

        public async Task<IEnumerable<ClientRatingDto>> GetAllAsync()
        {
            var ratings = await ratingRepository
                .Include(r => r.Client)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return ratings.Select(MapToDto);
        }

        public async Task<ClientRatingDto?> GetByAppointmentAsync(Guid appointmentId)
        {
            var rating = await ratingRepository
                .Query(r => r.AppointmentId == appointmentId)
                .Include(r => r.Client)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            return rating == null ? null : MapToDto(rating);
        }

        public async Task SendRatingRequestAsync(Guid appointmentId)
        {
            var appointment = await appointmentRepository
                .Query(a => a.Id == appointmentId)
                .Include(a => a.Client)
                .Include(a => a.Service)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync()
                ?? throw new KeyNotFoundException("Agendamento não encontrado.");

            if (appointment.Client == null || string.IsNullOrWhiteSpace(appointment.Client.Phone))
                throw new InvalidOperationException("Cliente sem telefone cadastrado.");

            var tenant = await tenantRepository.GetByIdAsync(false, appointment.TenantId)
                ?? throw new InvalidOperationException("Tenant não encontrado.");

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

            await whatsappService.SendTemplateMessageAsync(ratingMsg, tenant.WhatsappPhoneNumberId);
        }

        private static ClientRatingDto MapToDto(ClientRating r) => new(
            r.Id,
            r.AppointmentId,
            r.ClientId,
            r.Client?.Name ?? string.Empty,
            r.Stars,
            r.Comment,
            r.Source,
            r.CreatedAt
        );
    }
}
