using MediatR;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public record UpdateAppointmentStatusCommand(Guid AppointmentId, AppointmentStatus Status) : IRequest<bool>;
