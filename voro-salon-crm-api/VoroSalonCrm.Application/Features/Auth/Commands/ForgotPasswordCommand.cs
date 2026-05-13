using MediatR;
using VoroSalonCrm.Application.DTOs;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record ForgotPasswordCommand(ForgotPasswordDto Dto) : IRequest;
