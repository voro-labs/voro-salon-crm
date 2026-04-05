namespace VoroSalonCrm.Application.DTOs.Employee
{
    public record EmployeeGoalDto(
        Guid Id,
        Guid EmployeeId,
        string EmployeeName,
        int Month,
        int Year,
        decimal TargetAmount,
        int TargetAppointments,
        decimal ActualAmount,
        int ActualAppointments,
        double AmountProgressPercent,
        double AppointmentsProgressPercent
    );

    public record CreateEmployeeGoalDto(
        Guid EmployeeId,
        int Month,
        int Year,
        decimal TargetAmount,
        int TargetAppointments
    );

    public record UpdateEmployeeGoalDto(
        decimal TargetAmount,
        int TargetAppointments
    );
}
