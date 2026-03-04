using System.Text;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Services
{
    public class ExportService(
        IClientRepository clientRepository,
        IServiceRecordRepository serviceRepository) : IExportService
    {
        private readonly IClientRepository _clientRepository = clientRepository;
        private readonly IServiceRecordRepository _serviceRepository = serviceRepository;

        public async Task<(byte[] FileBytes, string FileName)> ExportClientsCsvAsync()
        {
            var serviceStats = await _serviceRepository.Query()
                .GroupBy(s => s.ClientId)
                .Select(g => new
                {
                    ClientId = g.Key,
                    LastService = g.Max(s => (DateTimeOffset?)s.ServiceDate),
                    ServiceCount = g.Count(),
                    TotalSpent = g.Sum(s => s.Amount)
                })
                .ToDictionaryAsync(x => x.ClientId);

            var clientsList = await _clientRepository.Query()
                .OrderBy(c => c.Name)
                .ToListAsync();

            var clients = clientsList.Select(c => new
            {
                c.Name,
                c.Phone,
                c.Notes,
                c.CreatedAt,
                LastService = serviceStats.TryGetValue(c.Id, out var stat) ? stat.LastService : null,
                ServiceCount = serviceStats.TryGetValue(c.Id, out var stat2) ? stat2.ServiceCount : 0,
                TotalSpent = serviceStats.TryGetValue(c.Id, out var stat3) ? stat3.TotalSpent : 0m
            }).ToList();

            var sb = new StringBuilder();
            sb.AppendLine("Nome,Telefone,Observacoes,Cadastro,Ultimo Servico,Total Servicos,Total Gasto");

            foreach (var c in clients)
            {
                var name = EscapeCsv(c.Name);
                var phone = EscapeCsv(c.Phone);
                var notes = EscapeCsv(c.Notes ?? string.Empty);
                var created = c.CreatedAt.ToString("dd/MM/yyyy");
                var lastService = c.LastService.HasValue ? c.LastService.Value.ToString("dd/MM/yyyy") : "Nenhum";
                var totalSpent = $"R$ {c.TotalSpent.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)}";

                sb.AppendLine($"\"{name}\",\"{phone}\",\"{notes}\",\"{created}\",\"{lastService}\",{c.ServiceCount},\"{totalSpent}\"");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var filename = $"clientes-{DateTime.UtcNow:yyyy-MM-dd}.csv";

            return (bytes, filename);
        }

        public async Task<(byte[] FileBytes, string FileName)> ExportServiceRecordsCsvAsync()
        {
            var services = await _serviceRepository.Query()
                .Include(s => s.Client)
                .OrderByDescending(s => s.ServiceDate)
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine("Data,Cliente,Descricao,Valor,Observacoes");

            foreach (var s in services)
            {
                var date = s.ServiceDate.ToString("dd/MM/yyyy HH:mm");
                var clientName = EscapeCsv(s.Client?.Name ?? string.Empty);
                var description = EscapeCsv(s.Description);
                var amount = $"R$ {s.Amount.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)}";
                var notes = EscapeCsv(s.Notes ?? string.Empty);

                sb.AppendLine($"\"{date}\",\"{clientName}\",\"{description}\",\"{amount}\",\"{notes}\"");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            var filename = $"servicos-{DateTime.UtcNow:yyyy-MM-dd}.csv";

            return (bytes, filename);
        }

        private static string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            return value.Replace("\"", "\"\"");
        }
    }
}
