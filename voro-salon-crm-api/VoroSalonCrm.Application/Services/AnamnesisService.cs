using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class AnamnesisService(
        IAnamnesisQuestionRepository questionRepository,
        IAnamnesisSheetRepository sheetRepository,
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService) : IAnamnesisService
    {
        private readonly IAnamnesisQuestionRepository _questionRepository = questionRepository;
        private readonly IAnamnesisSheetRepository _sheetRepository = sheetRepository;
        private readonly IClientRepository _clientRepository = clientRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;

        public async Task<IEnumerable<AnamnesisQuestionDto>> GetQuestionsAsync()
        {
            var questions = await _questionRepository.GetAllAsync(q => !q.IsDeleted);
            return questions
                .OrderBy(q => q.Section)
                .ThenBy(q => q.Order)
                .Select(MapToQuestionDto);
        }

        public async Task<AnamnesisQuestionDto> CreateQuestionAsync(CreateAnamnesisQuestionDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var question = new AnamnesisQuestion
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Identifier = GenerateIdentifier(dto.Label),
                Text = dto.Label,
                Placeholder = dto.Placeholder,
                FieldType = dto.FieldType,
                Options = dto.Options,
                Section = dto.Section,
                Order = dto.Order,
                IsRequired = dto.IsRequired,
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _questionRepository.AddAsync(question);
            await _unitOfWork.SaveChangesAsync();

            return MapToQuestionDto(question);
        }

        public async Task<IEnumerable<AnamnesisQuestionDto>> BulkCreateQuestionsAsync(IEnumerable<CreateAnamnesisQuestionDto> dtos)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var questions = new List<AnamnesisQuestion>();
            var now = DateTimeOffset.UtcNow;

            foreach (var dto in dtos)
            {
                questions.Add(new AnamnesisQuestion
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Identifier = GenerateIdentifier(dto.Label),
                    Text = dto.Label,
                    Placeholder = dto.Placeholder,
                    FieldType = dto.FieldType,
                    Options = dto.Options,
                    Section = dto.Section,
                    Order = dto.Order,
                    IsRequired = dto.IsRequired,
                    CreatedAt = now
                });
            }

            await _questionRepository.AddRangeAsync(questions);
            await _unitOfWork.SaveChangesAsync();

            return questions.Select(MapToQuestionDto);
        }

        public async Task<AnamnesisQuestionDto> UpdateQuestionAsync(UpdateAnamnesisQuestionDto dto)
        {
            var question = await _questionRepository.GetByIdAsync(q => q.Id == dto.Id && !q.IsDeleted);
            if (question == null)
                throw new KeyNotFoundException("Question not found.");

            question.Text = dto.Label;
            question.Placeholder = dto.Placeholder;
            question.FieldType = dto.FieldType;
            question.Options = dto.Options;
            question.Section = dto.Section;
            question.Order = dto.Order;
            question.IsRequired = dto.IsRequired;
            question.UpdatedAt = DateTimeOffset.UtcNow;

            _questionRepository.Update(question);
            await _unitOfWork.SaveChangesAsync();

            return MapToQuestionDto(question);
        }

        public async Task<bool> DeleteQuestionAsync(Guid id)
        {
            var question = await _questionRepository.GetByIdAsync(q => q.Id == id && !q.IsDeleted);
            if (question == null) return false;

            question.IsDeleted = true;
            question.DeletedAt = DateTimeOffset.UtcNow;

            _questionRepository.Update(question);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        private string GenerateIdentifier(string label)
        {
            return label.ToUpper()
                .Replace(" ", "_")
                .Replace("?", "")
                .Replace("!", "")
                .Replace(".", "")
                .Replace(",", "")
                .Normalize()
                .Trim();
        }

        private AnamnesisQuestionDto MapToQuestionDto(AnamnesisQuestion q)
        {
            return new AnamnesisQuestionDto(
                q.Id, q.Identifier, q.Text, q.Placeholder, q.FieldType, q.Options, q.Section, q.Order, q.IsRequired);
        }

        public async Task<AnamnesisSheetDto> CreateAnamnesisAsync(CreateAnamnesisSheetDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            var sheet = new AnamnesisSheet
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ClientId = dto.ClientId,
                ProfessionalId = dto.ProfessionalId,
                Date = dto.Date,
                Diagnosis = dto.Diagnosis,
                TreatmentProtocol = dto.TreatmentProtocol,
                Status = Domain.Enums.AnamnesisSheetStatus.Completed,
                CreatedAt = DateTimeOffset.UtcNow
            };

            foreach (var respDto in dto.Responses)
            {
                sheet.Responses.Add(new AnamnesisResponse
                {
                    Id = Guid.NewGuid(),
                    QuestionId = respDto.QuestionId,
                    Value = respDto.Value
                });
            }

            if (dto.Evidences != null)
            {
                foreach (var evDto in dto.Evidences)
                {
                    sheet.Evidences.Add(new AnamnesisEvidence
                    {
                        Id = Guid.NewGuid(),
                        Url = evDto.Url,
                        Type = evDto.Type,
                        Description = evDto.Description,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
            }

            foreach (var sigDto in dto.Signatures)
            {
                sheet.Signatures.Add(new AnamnesisSignature
                {
                    Id = Guid.NewGuid(),
                    Type = sigDto.Type,
                    SignatureData = sigDto.SignatureData,
                    SignedAt = DateTimeOffset.UtcNow
                });
            }

            await _sheetRepository.AddAsync(sheet);
            await _unitOfWork.SaveChangesAsync();

            return MapToDto(sheet);
        }

        public async Task<AnamnesisSheetDto> CreateClientWithAnamnesisAsync(CreateClientWithAnamnesisDto dto)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant invalid or not found in context.");

            // Start transaction
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                var client = new Client
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    Name = dto.Client.Name,
                    Phone = dto.Client.Phone,
                    Email = dto.Client.Email,
                    Notes = dto.Client.Notes,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                await _clientRepository.AddAsync(client);

                var anamnesisDto = dto.Anamnesis with { ClientId = client.Id };
                var anamnesis = await CreateAnamnesisAsync(anamnesisDto);

                await _unitOfWork.CommitAsync();
                return anamnesis;
            }
            catch (Exception)
            {
                await _unitOfWork.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<AnamnesisSheetDto>> GetClientHistoryAsync(Guid clientId)
        {
            var sheets = await _sheetRepository.GetAllAsync(
                s => s.ClientId == clientId && !s.IsDeleted,
                asNoTracking: true,
                query => query.Include(s => s.Responses)
                              .Include(s => s.Evidences)
                              .Include(s => s.Signatures));

            var dtos = new List<AnamnesisSheetDto>();
            foreach (var s in sheets.OrderByDescending(s => s.Date))
            {
                dtos.Add(MapToDto(s));
            }
            return dtos;
        }

        public async Task<AnamnesisSheetDto?> GetByIdAsync(Guid id)
        {
            var sheet = await _sheetRepository.GetByIdAsync(
                s => s.Id == id && !s.IsDeleted,
                false,
                query => query.Include(s => s.Responses)
                              .Include(s => s.Evidences)
                              .Include(s => s.Signatures));

            if (sheet == null) return null;

            return MapToDto(sheet);
        }

        private static AnamnesisSheetDto MapToDto(AnamnesisSheet s)
        {
            return new AnamnesisSheetDto(
                s.Id,
                s.ClientId,
                s.ProfessionalId,
                s.Date,
                s.Diagnosis,
                s.TreatmentProtocol,
                s.Status,
                s.Responses.Select(r => new AnamnesisResponseDto(r.QuestionId, r.Value)),
                s.Evidences.Select(e => new AnamnesisEvidenceDto(e.Url, e.Type, e.Description)),
                s.Signatures.Select(sig => new AnamnesisSignatureDto(sig.Type, sig.SignatureData)),
                s.CreatedAt
            );
        }
    }
}
