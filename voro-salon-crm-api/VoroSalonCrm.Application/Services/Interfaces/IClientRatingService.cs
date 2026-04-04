using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IClientRatingService
    {
        /// <summary>Submit a rating for an appointment (public — no auth required).</summary>
        Task<ClientRatingDto> SubmitAsync(Guid appointmentId, SubmitRatingDto dto);

        /// <summary>Get all ratings for the current tenant.</summary>
        Task<IEnumerable<ClientRatingDto>> GetAllAsync();

        /// <summary>Get the rating for a specific appointment, or null if not rated yet.</summary>
        Task<ClientRatingDto?> GetByAppointmentAsync(Guid appointmentId);
    }
}
