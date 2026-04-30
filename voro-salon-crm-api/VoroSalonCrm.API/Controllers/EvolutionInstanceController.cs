using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Shared.Extensions;
using VoroSalonCrm.Shared.ViewModels;

namespace VoroSalonCrm.API.Controllers
{
    [Route("api/v{version:version}/[controller]")]
    [Route("api/[controller]")]
    [Tags("Evolution Go Instances")]
    [ApiController]
    [Authorize]
    public class EvolutionInstanceController(
        IEvolutionInstanceService evolutionInstanceService,
        ICurrentUserService currentUserService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var instances = await evolutionInstanceService.GetByTenantAsync(tenantId, ct);
                return ResponseViewModel<IEnumerable<EvolutionInstanceDto>>.Success(instances).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost]
        [Authorize(Roles = "Owner,SalonOwner")]
        public async Task<IActionResult> Create(CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var instance = await evolutionInstanceService.CreateAsync(tenantId, ct);

                // Configurar webhook automaticamente após criar
                try { await evolutionInstanceService.ConnectWebhookAsync(tenantId, instance.Id, ct); }
                catch (Exception ex) { /* não bloquear criação se webhook falhar */
                    HttpContext.Items["webhookWarning"] = ex.Message; }

                return ResponseViewModel<EvolutionInstanceDto>
                    .SuccessWithMessage("Instância criada com sucesso.", instance)
                    .ToActionResult();
            }
            catch (InvalidOperationException ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("{id:guid}/status")]
        public async Task<IActionResult> GetStatus([FromRoute] Guid id, CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var status = await evolutionInstanceService.GetStatusAsync(tenantId, id, ct);
                return ResponseViewModel<EvolutionInstanceStatusDto>.Success(status).ToActionResult();
            }
            catch (KeyNotFoundException ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpGet("{id:guid}/qr")]
        public async Task<IActionResult> GetQr([FromRoute] Guid id, CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var qr = await evolutionInstanceService.GetQrAsync(tenantId, id, ct);
                return ResponseViewModel<EvolutionInstanceQrDto>.Success(qr).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("{id:guid}/pair")]
        public async Task<IActionResult> Pair([FromRoute] Guid id, [FromBody] EvolutionInstancePairRequestDto dto, CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                var result = await evolutionInstanceService.PairAsync(tenantId, id, dto.Phone, ct);
                return ResponseViewModel<EvolutionInstancePairResultDto>.Success(result).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("{id:guid}/connect-webhook")]
        [Authorize(Roles = "Owner,SalonOwner")]
        public async Task<IActionResult> ConnectWebhook([FromRoute] Guid id, CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                await evolutionInstanceService.ConnectWebhookAsync(tenantId, id, ct);
                return ResponseViewModel<object>.SuccessWithMessage("Webhook configurado.", null).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpPost("{id:guid}/disconnect")]
        [Authorize(Roles = "Owner,SalonOwner")]
        public async Task<IActionResult> Disconnect([FromRoute] Guid id, CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                await evolutionInstanceService.DisconnectAsync(tenantId, id, ct);
                return ResponseViewModel<object>.SuccessWithMessage("Instância desconectada.", null).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Owner,SalonOwner")]
        public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
        {
            try
            {
                var tenantId = currentUserService.TenantId;
                await evolutionInstanceService.DeleteAsync(tenantId, id, ct);
                return ResponseViewModel<object>.SuccessWithMessage("Instância excluída.", null).ToActionResult();
            }
            catch (Exception ex)
            {
                return ResponseViewModel<object>.Fail(ex.Message).ToActionResult();
            }
        }
    }
}
