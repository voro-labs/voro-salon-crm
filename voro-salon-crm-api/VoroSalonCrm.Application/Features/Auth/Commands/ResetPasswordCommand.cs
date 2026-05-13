using MediatR;
using VoroSalonCrm.Application.DTOs;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public record ResetPasswordCommand(ResetPasswordDto Dto) : IRequest<bool>;
