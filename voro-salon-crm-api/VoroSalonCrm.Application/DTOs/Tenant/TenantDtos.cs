using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Tenant
{
    public record CreateTenantDto(
        [Required][StringLength(150)] string Name,
        [Required][StringLength(100)] string Slug,
        EstablishmentType? EstablishmentType
    );

    public record UpdateTenantDto(
        [StringLength(150)] string? Name,
        [StringLength(100)] string? Slug,
        bool? IsActive,
        string? LogoUrl,
        string? PrimaryColor,
        string? SecondaryColor,
        string? ContactPhone,
        string? ContactEmail,
        string? ThemeMode,
        EstablishmentType? EstablishmentType,
        string? WhatsappPhoneNumberId = null,
        string? WhatsappBusinessAccountId = null,
        bool? UseWhatsappBooking = null,
        string? BirthdayWhatsappTemplateName = null
    );

    public record TenantDto(
        Guid Id,
        string Name,
        string Slug,
        bool IsActive,
        DateTimeOffset CreatedAt,
        string? LogoUrl,
        string? PrimaryColor,
        string? SecondaryColor,
        string? ContactPhone,
        string? ContactEmail,
        string? ThemeMode,
        EstablishmentType EstablishmentType,
        string? WhatsappPhoneNumberId = null,
        string? WhatsappBusinessAccountId = null,
        bool UseWhatsappBooking = false,
        string? BirthdayWhatsappTemplateName = null
    );
}
