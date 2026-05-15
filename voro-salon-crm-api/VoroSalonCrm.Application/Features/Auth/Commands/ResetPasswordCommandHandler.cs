using MediatR;
using VoroSalonCrm.Application.Services.Interfaces.Identity;

namespace VoroSalonCrm.Application.Features.Auth.Commands;

public class ResetPasswordCommandHandler(IUserService userService)
    : IRequestHandler<ResetPasswordCommand, bool>
{
    public async Task<bool> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        => await userService.ResetPasswordAsync(request.Dto);
}
