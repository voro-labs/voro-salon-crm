using MediatR;
using VoroSalonCrm.Application.DTOs.CRM;

namespace VoroSalonCrm.Application.Features.PublicBooking.Queries;

public record GetAvailableSlotsQuery(
    string TenantSlug,
    DateTime Date,
    Guid? ServiceId = null,
    Guid? EmployeeId = null,
    List<Guid>? ServiceIds = null
) : IRequest<IEnumerable<AvailabilitySlotDto>>;
