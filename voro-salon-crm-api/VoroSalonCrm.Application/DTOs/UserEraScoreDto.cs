using VoroSwipeEntertainment.Domain.Enums;

namespace VoroSwipeEntertainment.Application.DTOs
{
    public class UserEraScoreDto
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public UserExtensionDto? User { get; set; }

        public EraEnum Era { get; set; }

        public double Score { get; set; }
    }
}