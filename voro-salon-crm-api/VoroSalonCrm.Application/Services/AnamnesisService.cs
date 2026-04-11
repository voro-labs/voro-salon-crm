using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.DTOs.Anamnesis;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.Repositories.Identity;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Application.Services
{
    public class AnamnesisService(
        IAnamnesisQuestionRepository questionRepository,
        IAnamnesisSheetRepository sheetRepository,
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService,
        IWhatsappService whatsappService,
        ITenantRepository tenantRepository,
        IConfiguration configuration,
        ILogger<AnamnesisService> logger,
        IUserRepository userRepository) : IAnamnesisService
    {
        private readonly IAnamnesisQuestionRepository _questionRepository = questionRepository;
        private readonly IAnamnesisSheetRepository _sheetRepository = sheetRepository;
        private readonly IClientRepository _clientRepository = clientRepository;
        private readonly IUnitOfWork _unitOfWork = unitOfWork;
        private readonly ICurrentUserService _currentUserService = currentUserService;
        private readonly IWhatsappService _whatsappService = whatsappService;
        private readonly ITenantRepository _tenantRepository = tenantRepository;
        private readonly IConfiguration _configuration = configuration;
        private readonly ILogger<AnamnesisService> _logger = logger;
        private readonly IUserRepository _userRepository = userRepository;

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
                ProfessionalId = _currentUserService.UserId,
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

            var orderedSheets = sheets.OrderByDescending(s => s.Date).ToList();

            var professionalIds = orderedSheets
                .Where(s => s.ProfessionalId != Guid.Empty)
                .Select(s => s.ProfessionalId)
                .Distinct()
                .ToList();

            var users = await _userRepository.GetAllAsync(u => professionalIds.Contains(u.Id));
            var userNames = users.ToDictionary(u => u.Id, u => $"{u.FirstName} {u.LastName}".Trim());

            return orderedSheets.Select(s =>
            {
                userNames.TryGetValue(s.ProfessionalId, out var name);
                return MapToDto(s, name);
            });
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

            string? professionalName = null;
            if (sheet.ProfessionalId != Guid.Empty)
            {
                var user = await _userRepository.GetByIdAsync(false, sheet.ProfessionalId);
                if (user != null)
                    professionalName = $"{user.FirstName} {user.LastName}".Trim();
            }

            return MapToDto(sheet, professionalName);
        }

        public async Task<string> GeneratePublicTokenAsync(Guid sheetId)
        {
            var sheet = await _sheetRepository.GetByIdAsync(false, sheetId)
                ?? throw new KeyNotFoundException("Anamnesis sheet not found.");

            sheet.PublicToken = Guid.NewGuid().ToString("N");
            sheet.PublicTokenExpiresAt = DateTimeOffset.UtcNow.AddHours(72);
            sheet.UpdatedAt = DateTimeOffset.UtcNow;

            _sheetRepository.Update(sheet);
            await _unitOfWork.SaveChangesAsync();

            // Send WhatsApp signing link to client
            try
            {
                var sheetWithDetails = await _sheetRepository
                    .Query(s => s.Id == sheetId)
                    .Include(s => s.Client)
                    .Include(s => s.Tenant)
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync();

                if (sheetWithDetails?.Client?.Phone != null && sheetWithDetails.Tenant != null &&
                    sheetWithDetails.Tenant.UseWhatsappBooking)
                {
                    var frontendUrl = _configuration["FrontendUrl"] ?? "https://app.vorosalon.com";
                    var signingUrl = $"{frontendUrl}/anamnesis/sign/{sheet.PublicToken}";

                    var templateMsg = new WhatsappTemplateMessageDto
                    {
                        To = sheetWithDetails.Client.Phone,
                        Template = new()
                        {
                            Name = "anamnesis_signing_3",
                            Components =
                            [
                                new() {
                                    Type = "body",
                                    Parameters =
                                    [
                                        new() { Type = "text", Text = sheetWithDetails.Client.Name },
                                        new() { Type = "text", Text = sheetWithDetails.Tenant.Name }
                                    ]
                                },
                                new() {
                                    Type = "button",
                                    SubType = "url",
                                    Index = "0",
                                    Parameters = [
                                        new() { Type = "text", Text = "sign/" + sheet.PublicToken }
                                    ]
                                }
                            ]
                        }
                    };

                    await _whatsappService.SendTemplateMessageAsync(templateMsg, sheetWithDetails.Tenant.WhatsappPhoneNumberId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Falha ao enviar link de assinatura via WhatsApp para ficha {SheetId}.", sheetId);
            }

            return sheet.PublicToken;
        }

        public async Task<PublicAnamnesisSheetDto?> GetSheetByPublicTokenAsync(string token)
        {
            var sheet = await _sheetRepository
                .Query(s => s.PublicToken == token && !s.IsDeleted)
                .Include(s => s.Client)
                .Include(s => s.Tenant)
                .Include(s => s.Responses)
                    .ThenInclude(r => r.Question)
                .Include(s => s.Signatures)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (sheet == null) return null;
            if (sheet.PublicTokenExpiresAt.HasValue && sheet.PublicTokenExpiresAt < DateTimeOffset.UtcNow)
                return null; // token expired

            var alreadySigned = sheet.Signatures.Any(sig =>
                sig.Type == Domain.Enums.AnamnesisSignatureType.Client);

            var questions = sheet.Responses
                .Where(r => r.Question != null)
                .Select(r => new PublicAnamnesisQuestionAnswerDto(r.Question.Text, r.Value));

            return new PublicAnamnesisSheetDto(
                sheet.Id,
                sheet.Client?.Name ?? string.Empty,
                sheet.Tenant?.Name ?? string.Empty,
                sheet.Date,
                sheet.Diagnosis,
                sheet.TreatmentProtocol,
                questions,
                alreadySigned,
                sheet.PublicTokenExpiresAt
            );
        }

        public async Task<bool> SubmitPublicSignatureAsync(string token, SubmitPublicSignatureDto dto)
        {
            var sheet = await _sheetRepository
                .Query(s => s.PublicToken == token && !s.IsDeleted)
                .Include(s => s.Signatures)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (sheet == null) return false;
            if (sheet.PublicTokenExpiresAt.HasValue && sheet.PublicTokenExpiresAt < DateTimeOffset.UtcNow)
                throw new InvalidOperationException("O link de assinatura expirou. Solicite um novo link.");

            if (sheet.Signatures.Any(sig => sig.Type == Domain.Enums.AnamnesisSignatureType.Client))
                throw new InvalidOperationException("Este documento já foi assinado.");

            sheet.Signatures.Add(new AnamnesisSignature
            {
                Id = Guid.NewGuid(),
                SheetId = sheet.Id,
                Type = Domain.Enums.AnamnesisSignatureType.Client,
                SignatureData = dto.SignatureData,
                SignedAt = DateTimeOffset.UtcNow
            });

            sheet.UpdatedAt = DateTimeOffset.UtcNow;

            _sheetRepository.Update(sheet);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        public async Task<SendFillRequestResultDto> CreateFillRequestAsync(Guid clientId)
        {
            var tenantId = _currentUserService.TenantId;
            if (tenantId == Guid.Empty)
                throw new UnauthorizedAccessException("Tenant inválido.");

            var client = await _clientRepository.GetByIdAsync(c => c.Id == clientId)
                ?? throw new KeyNotFoundException("Cliente não encontrado.");

            var sheet = new AnamnesisSheet
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                ClientId = clientId,
                ProfessionalId = _currentUserService.UserId,
                Date = DateTimeOffset.UtcNow,
                Status = Domain.Enums.AnamnesisSheetStatus.Draft,
                PublicToken = Guid.NewGuid().ToString("N"),
                PublicTokenExpiresAt = DateTimeOffset.UtcNow.AddHours(72),
                CreatedAt = DateTimeOffset.UtcNow
            };

            await _sheetRepository.AddAsync(sheet);
            await _unitOfWork.SaveChangesAsync();

            var tenant = await _tenantRepository.GetByIdAsync(false, tenantId);
            var frontendUrl = _configuration["FrontendUrl"] ?? "https://app.vorosalon.com";
            var fillUrl = $"{frontendUrl}/anamnesis/fill/{sheet.PublicToken}";

            if (tenant != null && tenant.UseWhatsappBooking && !string.IsNullOrWhiteSpace(tenant.WhatsappPhoneNumberId) &&
                !string.IsNullOrWhiteSpace(client.Phone))
            {
                try
                {
                    var templateMsg = new WhatsappTemplateMessageDto
                    {
                        To = client.Phone,
                        Template = new()
                        {
                            Name = "anamnesis_signing_3",
                            Components =
                            [
                                new() {
                                    Type = "body",
                                    Parameters =
                                    [
                                        new() { Type = "text", Text = client.Name },
                                        new() { Type = "text", Text = tenant.Name }
                                    ]
                                },
                                new() {
                                    Type = "button",
                                    SubType = "url",
                                    Index = "0",
                                    Parameters = [ new() { Type = "text", Text = "fill/" + sheet.PublicToken } ]
                                }
                            ]
                        }
                    };
                    await _whatsappService.SendTemplateMessageAsync(templateMsg, tenant.WhatsappPhoneNumberId);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao enviar link de preenchimento via WhatsApp para ficha {SheetId}.", sheet.Id);
                }

                return new SendFillRequestResultDto(true, false, null, null, null);
            }

            return new SendFillRequestResultDto(false, true, client.Phone, client.Name, sheet.PublicToken);
        }

        public async Task<PublicAnamnesisFillSheetDto?> GetFillSheetByTokenAsync(string token)
        {
            var sheet = await _sheetRepository
                .Query(s => s.PublicToken == token && !s.IsDeleted)
                .Include(s => s.Client)
                .Include(s => s.Tenant)
                .Include(s => s.Responses)
                .Include(s => s.Signatures)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (sheet == null) return null;
            if (sheet.Status != Domain.Enums.AnamnesisSheetStatus.Draft) return null;
            if (sheet.PublicTokenExpiresAt.HasValue && sheet.PublicTokenExpiresAt < DateTimeOffset.UtcNow) return null;

            var alreadyFilled = sheet.Responses.Any();

            var questions = await _questionRepository
                .Query(q => q.TenantId == sheet.TenantId && !q.IsDeleted)
                .OrderBy(q => q.Section)
                .ThenBy(q => q.Order)
                .ToListAsync();

            return new PublicAnamnesisFillSheetDto(
                sheet.Client?.Name ?? string.Empty,
                sheet.Tenant?.Name ?? string.Empty,
                sheet.PublicTokenExpiresAt,
                questions.Select(q => new PublicAnamnesisQuestionForFillDto(
                    q.Id, q.Text, q.Placeholder, q.FieldType, q.Options, q.IsRequired, q.Section, q.Order)),
                alreadyFilled
            );
        }

        public async Task<bool> FillAndSignAsync(string token, ClientFillAndSignDto dto)
        {
            var sheet = await _sheetRepository
                .Query(s => s.PublicToken == token && !s.IsDeleted)
                .Include(s => s.Responses)
                .Include(s => s.Signatures)
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync();

            if (sheet == null) return false;
            if (sheet.Status != Domain.Enums.AnamnesisSheetStatus.Draft)
                throw new InvalidOperationException("Esta ficha não está disponível para preenchimento.");
            if (sheet.PublicTokenExpiresAt.HasValue && sheet.PublicTokenExpiresAt < DateTimeOffset.UtcNow)
                throw new InvalidOperationException("O link de preenchimento expirou. Solicite um novo link.");
            if (sheet.Responses.Any())
                throw new InvalidOperationException("Esta ficha já foi preenchida.");

            foreach (var resp in dto.Responses)
            {
                sheet.Responses.Add(new AnamnesisResponse
                {
                    Id = Guid.NewGuid(),
                    SheetId = sheet.Id,
                    QuestionId = resp.QuestionId,
                    Value = resp.Value
                });
            }

            sheet.Signatures.Add(new AnamnesisSignature
            {
                Id = Guid.NewGuid(),
                SheetId = sheet.Id,
                Type = Domain.Enums.AnamnesisSignatureType.Client,
                SignatureData = dto.SignatureData,
                SignedAt = DateTimeOffset.UtcNow
            });

            sheet.Status = Domain.Enums.AnamnesisSheetStatus.Completed;
            sheet.Date = DateTimeOffset.UtcNow;
            sheet.UpdatedAt = DateTimeOffset.UtcNow;

            _sheetRepository.Update(sheet);
            await _unitOfWork.SaveChangesAsync();

            return true;
        }

        private static AnamnesisSheetDto MapToDto(AnamnesisSheet s, string? professionalName = null)
        {
            return new AnamnesisSheetDto(
                s.Id,
                s.ClientId,
                s.ProfessionalId,
                professionalName,
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
