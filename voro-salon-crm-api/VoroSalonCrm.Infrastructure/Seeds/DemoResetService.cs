using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Seeds
{
    public class DemoResetService(JasmimDbContext context) : IDemoResetService
    {
        private const string DemoSlug = "vorodemo";

        public async Task ResetAsync()
        {
            var tenant = await context.Tenants
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Slug == DemoSlug);

            if (tenant == null)
                return;

            var tenantId = tenant.Id;

            await DeleteDemoDataAsync(tenantId);
            await SeedDemoDefaultsAsync(tenantId);

            await context.SaveChangesAsync();
        }

        private async Task DeleteDemoDataAsync(Guid tenantId)
        {
            // Anamnese: filhos primeiro
            var sheetIds = await context.AnamnesisSheets
                .IgnoreQueryFilters()
                .Where(s => s.TenantId == tenantId)
                .Select(s => s.Id)
                .ToListAsync();

            if (sheetIds.Count > 0)
            {
                await context.AnamnesisSignatures
                    .IgnoreQueryFilters()
                    .Where(x => sheetIds.Contains(x.SheetId))
                    .ExecuteDeleteAsync();

                await context.AnamnesisEvidences
                    .IgnoreQueryFilters()
                    .Where(x => sheetIds.Contains(x.SheetId))
                    .ExecuteDeleteAsync();

                await context.AnamnesisResponses
                    .IgnoreQueryFilters()
                    .Where(x => sheetIds.Contains(x.SheetId))
                    .ExecuteDeleteAsync();

                await context.AnamnesisSheets
                    .IgnoreQueryFilters()
                    .Where(s => s.TenantId == tenantId)
                    .ExecuteDeleteAsync();
            }

            await context.AnamnesisQuestions
                .IgnoreQueryFilters()
                .Where(q => q.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.ServiceRecords
                .IgnoreQueryFilters()
                .Where(r => r.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.Appointments
                .IgnoreQueryFilters()
                .Where(a => a.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.Transactions
                .IgnoreQueryFilters()
                .Where(t => t.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.TransactionCategories
                .IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId)
                .ExecuteDeleteAsync();

            var employeeIds = await context.Employees
                .IgnoreQueryFilters()
                .Where(e => e.TenantId == tenantId)
                .Select(e => e.Id)
                .ToListAsync();

            if (employeeIds.Count > 0)
            {
                await context.EmployeeServices
                    .Where(es => employeeIds.Contains(es.EmployeeId))
                    .ExecuteDeleteAsync();

                await context.Employees
                    .IgnoreQueryFilters()
                    .Where(e => e.TenantId == tenantId)
                    .ExecuteDeleteAsync();
            }

            await context.Services
                .IgnoreQueryFilters()
                .Where(s => s.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.Clients
                .IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId)
                .ExecuteDeleteAsync();
        }

        private async Task SeedDemoDefaultsAsync(Guid tenantId)
        {
            var services = new List<Service>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Corte Feminino", Price = 80m, DurationMinutes = 60, CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Corte Masculino", Price = 50m, DurationMinutes = 30, CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Coloração", Price = 150m, DurationMinutes = 120, CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Escova Progressiva", Price = 200m, DurationMinutes = 180, CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Hidratação", Price = 60m, DurationMinutes = 45, CreatedAt = DateTimeOffset.UtcNow },
            };

            await context.Services.AddRangeAsync(services);

            var employees = new List<Employee>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Ana Costa", IsActive = true, HireDate = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Carlos Lima", IsActive = true, HireDate = DateTimeOffset.UtcNow, CreatedAt = DateTimeOffset.UtcNow },
            };

            await context.Employees.AddRangeAsync(employees);

            var clients = new List<Client>
            {
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Maria Silva", Phone = "(11) 98765-4321", Email = "maria@demo.com", CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "João Santos", Phone = "(11) 91234-5678", Email = "joao@demo.com", CreatedAt = DateTimeOffset.UtcNow },
                new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Fernanda Rocha", Phone = "(11) 99876-5432", Email = "fernanda@demo.com", CreatedAt = DateTimeOffset.UtcNow },
            };

            await context.Clients.AddRangeAsync(clients);
        }
    }
}
