using System.Globalization;
using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Interfaces.Cache;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Application.Services
{
    public class DashboardService(
        IServiceRecordRepository serviceRepository,
        IClientRepository clientRepository,
        ICurrentUserService currentUserService,
        ICacheService cacheService) : IDashboardService
    {
        private readonly IServiceRecordRepository _serviceRepository = serviceRepository;
        private readonly IClientRepository _clientRepository = clientRepository;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly ICacheService _cacheService = cacheService;

        public async Task<DashboardMetricsDto> GetDashboardMetricsAsync()
        {
            var tenantId = _currentUserService.TenantId;
            var cacheKey = $"dashboard:tenant:{tenantId}";

            var cached = await _cacheService.GetAsync<DashboardMetricsDto>(cacheKey);
            if (cached is not null) return cached;

            var now = DateTimeOffset.UtcNow;

            // Current month limits
            var startOfMonth = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
            var endOfMonth = startOfMonth.AddMonths(1).AddTicks(-1);

            // 1. Monthly Revenue & Count
            var currentMonthServices = await _serviceRepository.Query()
                .Where(s => s.ServiceDate >= startOfMonth && s.ServiceDate <= endOfMonth)
                .ToListAsync();

            var monthlyRevenue = currentMonthServices.Sum(s => s.Amount);
            var monthlyServiceCount = currentMonthServices.Count;

            // 2. Total Clients
            var totalClients = await _clientRepository.Query().CountAsync();

            // 3. Revenue By Month (last 6 months)
            var sixMonthsAgo = startOfMonth.AddMonths(-5); // start of 6 months ago up to today
            var lastSixMonthsServices = await _serviceRepository.Query()
                .Where(s => s.ServiceDate >= sixMonthsAgo)
                .ToListAsync();

            var revenueByMonth = lastSixMonthsServices
                .GroupBy(s => new { s.ServiceDate.Year, s.ServiceDate.Month })
                .Select(g =>
                {
                    var dateForLabel = new DateTime(g.Key.Year, g.Key.Month, 1);
                    return new RevenueByMonthDto(
                        Month: dateForLabel.ToString("yyyy-MM"),
                        MonthLabel: dateForLabel.ToString("MMM", CultureInfo.InvariantCulture),
                        Total: g.Sum(s => s.Amount),
                        Count: g.Count()
                    );
                })
                .OrderBy(r => r.Month)
                .ToList();

            // Ensure all 6 months are represented even if no services exist
            var filledRevenueByMonth = new List<RevenueByMonthDto>();
            for (int i = 5; i >= 0; i--)
            {
                var dt = startOfMonth.AddMonths(-i);
                var monthStr = dt.ToString("yyyy-MM");
                var existing = revenueByMonth.FirstOrDefault(r => r.Month == monthStr);

                if (existing != null)
                {
                    filledRevenueByMonth.Add(existing);
                }
                else
                {
                    filledRevenueByMonth.Add(new RevenueByMonthDto(
                        Month: monthStr,
                        MonthLabel: dt.ToString("MMM", CultureInfo.InvariantCulture),
                        Total: 0,
                        Count: 0
                    ));
                }
            }

            // 4. Top Clients (Top 5 by revenue)
            var topClientsQuery = await _serviceRepository.Query()
                .GroupBy(s => new { s.ClientId, s.Client.Name })
                .Select(g => new
                {
                    Name = g.Key.Name,
                    Count = g.Count(),
                    TotalSpent = g.Sum(x => x.Amount)
                })
                .OrderByDescending(x => x.TotalSpent)
                .Take(5)
                .ToListAsync();

            var topClientsDto = topClientsQuery
                .Select(x => new TopClientDto(x.Name, x.Count, x.TotalSpent))
                .ToList();

            var result = new DashboardMetricsDto(
                MonthlyRevenue: monthlyRevenue,
                MonthlyServiceCount: monthlyServiceCount,
                TotalClients: totalClients,
                RevenueByMonth: filledRevenueByMonth,
                TopClients: topClientsDto
            );

            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
            return result;
        }
    }
}
