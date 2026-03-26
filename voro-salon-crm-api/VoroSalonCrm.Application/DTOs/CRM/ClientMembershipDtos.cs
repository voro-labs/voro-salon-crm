using System.ComponentModel.DataAnnotations;

namespace VoroSalonCrm.Application.DTOs.CRM
{
    // ── Plans ──────────────────────────────────────────────────

    public record CreateClientMembershipPlanDto(
        [Required][MaxLength(100)] string Name,
        [MaxLength(300)] string? Description,
        [Range(0, double.MaxValue)] decimal Price,
        [Range(1, int.MaxValue)] int? Sessions,
        [Range(1, 3650)] int DurationDays
    );

    public record UpdateClientMembershipPlanDto(
        [Required][MaxLength(100)] string Name,
        [MaxLength(300)] string? Description,
        [Range(0, double.MaxValue)] decimal Price,
        [Range(1, int.MaxValue)] int? Sessions,
        [Range(1, 3650)] int DurationDays,
        bool IsActive
    );

    public record ClientMembershipPlanDto(
        Guid Id,
        string Name,
        string? Description,
        decimal Price,
        int? Sessions,
        int DurationDays,
        bool IsActive,
        int ActiveMembershipsCount
    );

    // ── Memberships ────────────────────────────────────────────

    public record CreateClientMembershipDto(
        [Required] Guid ClientId,
        [Required] Guid PlanId,
        [Required] DateTimeOffset StartDate,
        string? Notes
    );

    public record ClientMembershipDto(
        Guid Id,
        Guid ClientId,
        string ClientName,
        Guid PlanId,
        string PlanName,
        decimal PlanPrice,
        DateTimeOffset StartDate,
        DateTimeOffset EndDate,
        int? RemainingSessions,
        int? TotalSessions,
        string Status,
        string? Notes
    );
}
