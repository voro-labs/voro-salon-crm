using MediatR;
using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Features.Appointments.Commands;

public record CreateAppointmentCommand(CreateAppointmentDto Dto) : IRequest<AppointmentDto>;
