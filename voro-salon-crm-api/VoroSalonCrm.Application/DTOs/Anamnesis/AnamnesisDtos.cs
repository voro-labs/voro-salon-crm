using System.ComponentModel.DataAnnotations;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Domain.Enums;

namespace VoroSalonCrm.Application.DTOs.Anamnesis
{
    public record AnamnesisQuestionDto(
        Guid Id,
        string Identifier,
        string Label,
        string? Placeholder,
        AnamnesisFieldType FieldType,
        string? Options,
        AnamnesisSection Section,
        int Order,
        bool IsRequired
    );

    public record CreateAnamnesisQuestionDto(
        string Label,
        string? Placeholder,
        AnamnesisFieldType FieldType,
        string? Options,
        AnamnesisSection Section,
        int Order,
        bool IsRequired
    );

    public record UpdateAnamnesisQuestionDto(
        Guid Id,
        string Label,
        string? Placeholder,
        AnamnesisFieldType FieldType,
        string? Options,
        AnamnesisSection Section,
        int Order,
        bool IsRequired
    );

    public record AnamnesisResponseDto(
        Guid QuestionId,
        string Value
    );

    public record AnamnesisEvidenceDto(
        string Url,
        string? Type,
        string? Description
    );

    public record AnamnesisSignatureDto(
        AnamnesisSignatureType Type,
        string SignatureData
    );

    public record CreateAnamnesisSheetDto(
        Guid ClientId,
        Guid ProfessionalId,
        DateTimeOffset Date,
        string? Diagnosis,
        string? TreatmentProtocol,
        IEnumerable<AnamnesisResponseDto> Responses,
        IEnumerable<AnamnesisEvidenceDto>? Evidences,
        IEnumerable<AnamnesisSignatureDto> Signatures
    );

    public record AnamnesisSheetDto(
        Guid Id,
        Guid ClientId,
        Guid ProfessionalId,
        DateTimeOffset Date,
        string? Diagnosis,
        string? TreatmentProtocol,
        AnamnesisSheetStatus Status,
        IEnumerable<AnamnesisResponseDto> Responses,
        IEnumerable<AnamnesisEvidenceDto> Evidences,
        IEnumerable<AnamnesisSignatureDto> Signatures,
        DateTimeOffset CreatedAt
    );

    public record CreateClientWithAnamnesisDto(
        CreateClientDto Client,
        CreateAnamnesisSheetDto Anamnesis
    );

    /// <summary>Anamnesis sheet exposed publicly for client signing (no sensitive tenant data).</summary>
    public record PublicAnamnesisSheetDto(
        Guid Id,
        string ClientName,
        string TenantName,
        DateTimeOffset Date,
        string? Diagnosis,
        string? TreatmentProtocol,
        IEnumerable<PublicAnamnesisQuestionAnswerDto> Questions,
        bool AlreadySigned,
        DateTimeOffset? ExpiresAt
    );

    public record PublicAnamnesisQuestionAnswerDto(
        string Label,
        string Value
    );

    public record SubmitPublicSignatureDto(
        /// <summary>Base64-encoded PNG of the signature drawn on canvas.</summary>
        string SignatureData
    );
}
