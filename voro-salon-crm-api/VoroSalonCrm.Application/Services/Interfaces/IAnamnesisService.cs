using VoroSalonCrm.Application.DTOs.Anamnesis;

namespace VoroSalonCrm.Application.Services.Interfaces
{
    public interface IAnamnesisService
    {
        Task<IEnumerable<AnamnesisQuestionDto>> GetQuestionsAsync();
        Task<AnamnesisQuestionDto> CreateQuestionAsync(CreateAnamnesisQuestionDto dto);
        Task<IEnumerable<AnamnesisQuestionDto>> BulkCreateQuestionsAsync(IEnumerable<CreateAnamnesisQuestionDto> dtos);
        Task<AnamnesisQuestionDto> UpdateQuestionAsync(UpdateAnamnesisQuestionDto dto);
        Task<bool> DeleteQuestionAsync(Guid id);
        Task<AnamnesisSheetDto> CreateAnamnesisAsync(CreateAnamnesisSheetDto dto);
        Task<AnamnesisSheetDto> CreateClientWithAnamnesisAsync(CreateClientWithAnamnesisDto dto);
        Task<IEnumerable<AnamnesisSheetDto>> GetClientHistoryAsync(Guid clientId);
        Task<AnamnesisSheetDto?> GetByIdAsync(Guid id);

        // Public signing (no auth required)
        Task<string> GeneratePublicTokenAsync(Guid sheetId);
        Task<PublicAnamnesisSheetDto?> GetSheetByPublicTokenAsync(string token);
        Task<bool> SubmitPublicSignatureAsync(string token, SubmitPublicSignatureDto dto);

        // Public fill + sign (client fills the form themselves)
        Task<SendFillRequestResultDto> CreateFillRequestAsync(Guid clientId);
        Task<PublicAnamnesisFillSheetDto?> GetFillSheetByTokenAsync(string token);
        Task<bool> FillAndSignAsync(string token, ClientFillAndSignDto dto);
    }
}
