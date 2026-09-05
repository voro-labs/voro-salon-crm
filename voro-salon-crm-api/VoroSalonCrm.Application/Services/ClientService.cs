using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ClientService(
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        ITenantSubscriptionRepository subscriptionRepository,
        IUserNotificationService userNotificationService,
        IWhatsAppMessageService whatsAppMessageService,
        ICacheService cacheService) : IClientService
    {
        private readonly IClientRepository _clientRepository = clientRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly ITenantSubscriptionRepository _subscriptionRepository = subscriptionRepository;
        private readonly IUserNotificationService _userNotificationService = userNotificationService;
        private readonly IWhatsAppMessageService _whatsAppMessageService = whatsAppMessageService;
        private readonly ICacheService _cacheService = cacheService;

        public async Task<ClientDto> CreateAsync(CreateClientDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var subscription = await _subscriptionRepository.GetByTenantIdWithPlanAsync(tenantId);
            if (subscription?.Plan != null && subscription.Plan.MaxClients != -1)
            {
                var currentCount = await _clientRepository.Query().CountAsync();
                if (currentCount >= subscription.Plan.MaxClients)
                    throw new InvalidOperationException($"Limite de {subscription.Plan.MaxClients} clientes atingido para o seu plano atual.");
            }

            var client = new Client
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = dto.Name,
                Phone = dto.Phone,
                Notes = dto.Notes,
                BirthDate = dto.BirthDate,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _clientRepository.AddAsync(client);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"clients:tenant:{tenantId}");

            return new ClientDto(client.Id, client.Name, client.Phone, client.Email, client.Notes, client.CreatedAt, client.BirthDate);
        }

        public async Task<ClientDto?> GetByIdAsync(Guid id)
        {
            var client = await _clientRepository.GetByIdAsync(false, id);
            if (client is null) return null;

            return new ClientDto(client.Id, client.Name, client.Phone, client.Email, client.Notes, client.CreatedAt, client.BirthDate);
        }

        public async Task<IEnumerable<ClientDto>> GetAllAsync()
        {
            var tenantId = _currentUserService.TenantId;
            var cacheKey = $"clients:tenant:{tenantId}";

            var cached = await _cacheService.GetAsync<List<ClientDto>>(cacheKey);
            if (cached is not null) return cached;

            var clients = await _clientRepository.GetAllAsync();
            var result = clients.Select(c => new ClientDto(c.Id, c.Name, c.Phone, c.Email, c.Notes, c.CreatedAt, c.BirthDate)).ToList();

            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));
            return result;
        }

        public async Task<PagedResult<ClientDto>> GetPagedAsync(int page, int pageSize, string? search, string? orderBy = "name", string? sortDirection = "asc")
        {
            // Antes esta listagem paginava sobre a lista completa do tenant: cada página puxava
            // todos os clientes do cache só para descartar quase tudo, e o custo crescia junto com
            // o salão. Filtro, contagem, ordenação e recorte agora acontecem no Postgres (#116).
            // O cache de GetAllAsync continua servindo quem precisa da lista inteira (selects).
            var query = _clientRepository.Query();

            if (!string.IsNullOrWhiteSpace(search))
            {
                // Contains sobre ToLower vira strpos(lower(...)) no Postgres: case-insensitive e
                // sem curinga, então o texto digitado não vira padrão de busca.
                var term = search.Trim().ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(term) ||
                    (c.Email != null && c.Email.ToLower().Contains(term)) ||
                    (c.Phone != null && c.Phone.ToLower().Contains(term)));
            }

            // Conta com o filtro aplicado e antes do recorte: o total é do resultado, não da página.
            var totalCount = await query.CountAsync();

            // ThenBy(Id) desempata nomes repetidos - sem critério estável, Skip/Take pode repetir
            // ou pular registro entre páginas.
            var desc = sortDirection?.ToLowerInvariant() == "desc";
            query = (orderBy?.ToLowerInvariant()) switch
            {
                "name" or _ => desc
                    ? query.OrderByDescending(c => c.Name).ThenBy(c => c.Id)
                    : query.OrderBy(c => c.Name).ThenBy(c => c.Id),
            };

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new ClientDto(c.Id, c.Name, c.Phone, c.Email, c.Notes, c.CreatedAt, c.BirthDate))
                .ToListAsync();

            return new PagedResult<ClientDto>(items, totalCount, page, pageSize);
        }

        public async Task<ClientDto> UpdateAsync(Guid id, UpdateClientDto dto)
        {
            var client = await _clientRepository.GetByIdAsync(false, id)
                ?? throw new KeyNotFoundException($"Client '{id}' not found.");

            if (dto.Name is not null) client.Name = dto.Name;
            if (dto.Phone is not null) client.Phone = dto.Phone;
            if (dto.Email is not null) client.Email = dto.Email;
            if (dto.Notes is not null) client.Notes = dto.Notes;
            if (dto.BirthDate.HasValue) client.BirthDate = dto.BirthDate;

            client.UpdatedAt = DateTimeOffset.UtcNow;

            _clientRepository.Update(client);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"clients:tenant:{client.TenantId}");

            return new ClientDto(client.Id, client.Name, client.Phone, client.Email, client.Notes, client.CreatedAt, client.BirthDate);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var client = await _clientRepository.GetByIdAsync(false, id);
            if (client is null) return false;

            var clientPhone = client.Phone;
            var tenantId = client.TenantId;

            client.IsDeleted = true;
            client.DeletedAt = DateTimeOffset.UtcNow;

            _clientRepository.Update(client);
            await _unitOfWork.SaveChangesAsync();

            await _cacheService.RemoveAsync($"clients:tenant:{tenantId}");

            await _userNotificationService.DeleteByRelatedEntityIdAsync(id);

            if (!string.IsNullOrWhiteSpace(clientPhone))
                await _whatsAppMessageService.DeleteByPhoneAsync(tenantId, clientPhone);

            return true;
        }
    }
}
