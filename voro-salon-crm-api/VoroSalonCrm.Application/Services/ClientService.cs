using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class ClientService(IClientRepository clientRepository, IUnitOfWork unitOfWork, ICurrentUserService currentUserService) : IClientService
    {
        private readonly IClientRepository _clientRepository = clientRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;

        public async Task<ClientDto> CreateAsync(CreateClientDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var client = new Client
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = dto.Name,
                Phone = dto.Phone,
                Notes = dto.Notes,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _clientRepository.AddAsync(client);
            await _unitOfWork.SaveChangesAsync();

            return new ClientDto(client.Id, client.Name, client.Phone, client.Notes, client.CreatedAt);
        }

        public async Task<ClientDto?> GetByIdAsync(Guid id)
        {
            var client = await _clientRepository.GetByIdAsync(id);
            if (client is null) return null;

            return new ClientDto(client.Id, client.Name, client.Phone, client.Notes, client.CreatedAt);
        }

        public async Task<IEnumerable<ClientDto>> GetAllAsync()
        {
            var clients = await _clientRepository.GetAllAsync();
            return clients.Select(c => new ClientDto(c.Id, c.Name, c.Phone, c.Notes, c.CreatedAt));
        }

        public async Task<ClientDto> UpdateAsync(Guid id, UpdateClientDto dto)
        {
            var client = await _clientRepository.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Client '{id}' not found.");

            if (dto.Name is not null) client.Name = dto.Name;
            if (dto.Phone is not null) client.Phone = dto.Phone;
            if (dto.Notes is not null) client.Notes = dto.Notes;

            client.UpdatedAt = DateTimeOffset.UtcNow;

            _clientRepository.Update(client);
            await _unitOfWork.SaveChangesAsync();

            return new ClientDto(client.Id, client.Name, client.Phone, client.Notes, client.CreatedAt);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var client = await _clientRepository.GetByIdAsync(id);
            if (client is null) return false;

            client.IsDeleted = true;
            client.DeletedAt = DateTimeOffset.UtcNow;

            _clientRepository.Update(client);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }
    }
}
