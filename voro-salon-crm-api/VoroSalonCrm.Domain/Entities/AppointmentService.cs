namespace VoroSalonCrm.Domain.Entities
{
    public class AppointmentService
    {
        public Guid AppointmentId { get; set; }
        public Appointment Appointment { get; set; } = null!;

        public Guid ServiceId { get; set; }
        public Service Service { get; set; } = null!;
    }
}
