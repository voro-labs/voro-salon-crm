namespace VoroSalonCrm.Application.DTOs.CRM
{
    public record RevenueByMonthDto(
        string Month, 
        string MonthLabel, 
        decimal Total, 
        int Count
    );
    
    public record TopClientDto(
        string Name, 
        int ServiceCount, 
        decimal TotalSpent
    );

    public record DashboardMetricsDto(
        decimal MonthlyRevenue,
        int MonthlyServiceCount,
        int TotalClients,
        IEnumerable<RevenueByMonthDto> RevenueByMonth,
        IEnumerable<TopClientDto> TopClients
    );
}
