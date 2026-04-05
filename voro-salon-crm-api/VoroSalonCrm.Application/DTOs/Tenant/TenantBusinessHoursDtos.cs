using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.Tenant
{
    public record TimeRangeDto(string OpenTime, string CloseTime);

    public record BusinessHoursDayDto(
        int DayOfWeek,
        bool IsOpen,
        List<TimeRangeDto> Ranges
    );

    public record UpsertBusinessHoursDayDto(
        int DayOfWeek,
        bool IsOpen,
        List<TimeRangeDto> Ranges
    );

    public record UpsertBusinessHoursDto(
        [Required] List<UpsertBusinessHoursDayDto> Days
    );
}
