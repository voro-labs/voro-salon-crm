using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ClientRatingService(
        IClientRatingRepository ratingRepository,
        IAppointmentRepository appointmentRepository,
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
