using MediatR;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;

namespace VoroSalonCrm.Application.Features.PublicBooking.Commands;

public record CreateBookingCommand(PublicBookingCreateDto Dto) : IRequest<PublicBookingResponseDto>;
