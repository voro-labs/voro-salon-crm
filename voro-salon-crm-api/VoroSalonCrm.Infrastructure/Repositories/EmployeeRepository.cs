using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class EmployeeRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<Employee>(context, unitOfWork), IEmployeeRepository
    {
        public async Task<IEnumerable<Employee>> GetByTenantWithSpecialtiesAsync(Guid tenantId)
        {
            return await context.Employees
                .Include(e => e.Specialties)
                .ThenInclude(es => es.Service)
                .Where(e => e.TenantId == tenantId)
                .ToListAsync();
        }

        public async Task<Employee?> GetByIdWithSpecialtiesAsync(Guid id)
        {
            return await context.Employees
                .Include(e => e.Specialties)
                .ThenInclude(es => es.Service)
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task UpdateSpecialtiesAsync(Guid employeeId, IEnumerable<Guid> serviceIds)
        {
            var current = await context.EmployeeServices
                .Where(es => es.EmployeeId == employeeId)
                .ToListAsync();

            context.EmployeeServices.RemoveRange(current);

            var @new = serviceIds.Select(sid => new EmployeeService
            {
                EmployeeId = employeeId,
                ServiceId = sid
            });

            await context.EmployeeServices.AddRangeAsync(@new);
        }

        public async Task<IEnumerable<Employee>> GetAvailableForServiceAsync(Guid tenantId, Guid serviceId)
        {
            return await context.Employees
                .Where(e => e.TenantId == tenantId && e.IsActive && !e.IsDeleted)
                .Where(e => e.Specialties.Any(es => es.ServiceId == serviceId))
                .ToListAsync();
        }

        public async Task<IEnumerable<Employee>> GetPublicEmployeesByServiceAsync(Guid tenantId, Guid serviceId)
        {
            var employees = await context.Employees
                .IgnoreQueryFilters()
                .Include(e => e.Specialties)
                .Where(e => e.TenantId == tenantId && e.IsActive && !e.IsDeleted && e.Specialties.Any(es => es.ServiceId == serviceId))
                .ToListAsync();

            // Se nenhum funcionário está vinculado especificamente a este serviço,
            // retorna todos os funcionários ativos do tenant
            if (employees.Count == 0)
            {
                employees = await context.Employees
                    .IgnoreQueryFilters()
                    .Where(e => e.TenantId == tenantId && e.IsActive && !e.IsDeleted)
                    .ToListAsync();
            }

            return employees;
        }
    }
}
