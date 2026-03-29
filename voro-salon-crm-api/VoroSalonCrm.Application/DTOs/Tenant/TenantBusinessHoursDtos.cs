using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.Tenant
{
    public record BusinessHoursDayDto(
        int DayOfWeek,
        bool IsOpen,
        string OpenTime,
        string CloseTime
    );

    // Used to upsert all 7 days at once
    public record UpsertBusinessHoursDto(
        [Required] List<BusinessHoursDayDto> Days
    );
}
