using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.DTOs.Integration;
using VoroSalonCrm.Application.DTOs.Public;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Interfaces.Repositories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    public class WhatsappChatService : IWhatsappChatService
    {
        private readonly IWhatsappService _whatsappService;
        private readonly IPublicBookingService _publicBookingService;
        private readonly ITenantRepository _tenantRepository;
        private readonly IMemoryCache _cache;
        private readonly ILogger<WhatsappChatService> _logger;

        private const string CACHE_PREFIX = "wa_booking_";

        public WhatsappChatService(
            IWhatsappService whatsappService,
            IPublicBookingService publicBookingService,
            ITenantRepository tenantRepository,
            IMemoryCache cache,
            ILogger<WhatsappChatService> logger)
        {
            _whatsappService = whatsappService;
            _publicBookingService = publicBookingService;
            _tenantRepository = tenantRepository;
            _cache = cache;
            _logger = logger;
        }

        private class BookingSession
        {
            public string State { get; set; } = "START";
            public string? TenantSlug { get; set; }
            public string? TenantName { get; set; }
            public Guid? ServiceId { get; set; }
            public string? ServiceName { get; set; }
            public Guid? EmployeeId { get; set; }
            public string? EmployeeName { get; set; }
            public DateTime? SelectedDate { get; set; }
            public string? SelectedTime { get; set; }
        }

        public async Task HandleMessageAsync(WhatsappMessageDto message, string contactName, string displayPhoneNumber, CancellationToken ct = default)
        {
            var from = message.From;
            var sessionKey = $"{CACHE_PREFIX}{from}";

            if (!_cache.TryGetValue(sessionKey, out BookingSession? session) || session == null)
            {
                session = new BookingSession();

                // Try to find tenant by receiving phone number
                var tenant = await _tenantRepository.Query(t => t.IsActive && t.ContactPhone == displayPhoneNumber).FirstOrDefaultAsync(ct);

                if (tenant != null)
                {
                    session.TenantSlug = tenant.Slug;
                    session.TenantName = tenant.Name;
                    session.State = "START";
                }
                else
                {
                    session.State = "AWAITING_TENANT";
                    await AskForTenantAsync(from, contactName, ct);
                    _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
                    return;
                }
            }

            // Handle user response based on current state
            try
            {
                if (message.Type == "audio")
                {
                    await _whatsappService.SendTextMessageAsync(from, "Ainda estou aprendendo a ouvir áudios! 🎧 Por favor, pode digitar sua mensagem?", ct);
                    return;
                }

                switch (session.State)
                {
                    case "AWAITING_TENANT":
                        await HandleTenantSelectionAsync(from, message, session, ct);
                        break;

                    case "START":
                        await StartBookingFlowAsync(from, contactName, session, ct);
                        break;

                    case "AWAITING_SERVICE":
                        await HandleServiceSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_EMPLOYEE":
                        await HandleEmployeeSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_DATE":
                        await HandleDateSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_TIME":
                        await HandleTimeSelectionAsync(from, message, session, ct);
                        break;

                    case "AWAITING_CONFIRMATION":
                        await HandleConfirmationAsync(from, message, contactName, session, ct);
                        break;

                    default:
                        session.State = "START";
                        await StartBookingFlowAsync(from, contactName, session, ct);
                        break;
                }

                // Save or clear session
                if (session.State == "COMPLETED")
                {
                    _cache.Remove(sessionKey);
                }
                else
                {
                    _cache.Set(sessionKey, session, TimeSpan.FromMinutes(15));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error handling WhatsApp message for {From}", from);
                await _whatsappService.SendTextMessageAsync(from, "Ops, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.", ct);
            }
        }

        private async Task AskForTenantAsync(string from, string contactName, CancellationToken ct)
        {
            var tenants = await _tenantRepository.Query(t => t.IsActive).Take(10).ToListAsync(ct);

            if (tenants.Count == 0)
            {
                await _whatsappService.SendTextMessageAsync(from, "Desculpe, não encontramos estabelecimentos ativos no sistema.", ct);
                return;
            }

            var rows = tenants.Select(t => new
            {
                id = t.Slug,
                title = t.Name.Length > 24 ? t.Name.Substring(0, 21) + "..." : t.Name,
                description = "Clique para selecionar"
            }).ToList();

            var interactive = new
            {
                type = "list",
                header = new { type = "text", text = "VoroLabs" },
                body = new { text = $"Olá {contactName}! Qual estabelecimento você deseja agendar hoje?" },
                action = new
                {
                    button = "Ver estabelecimentos",
                    sections = new[]
                    {
                        new { title = "Estabelecimentos", rows }
                    }
                }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, ct);
        }

        private async Task HandleTenantSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? slug = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                slug = message.Interactive.ListReply.Id;

            if (!string.IsNullOrEmpty(slug))
            {
                var tenant = await _tenantRepository.Query(t => t.Slug == slug).FirstOrDefaultAsync(ct);
                session.TenantSlug = slug;
                session.TenantName = tenant?.Name ?? "Salão";
                session.State = "START";

                await StartBookingFlowAsync(from, "Cliente", session, ct);
            }
            else
            {
                await _whatsappService.SendTextMessageAsync(from, "Por favor, selecione um estabelecimento da lista.", ct);
            }
        }

        private async Task StartBookingFlowAsync(string from, string contactName, BookingSession session, CancellationToken ct)
        {
            var services = await _publicBookingService.GetServicesByTenantAsync(session.TenantSlug!);

            if (!services.Any())
            {
                await _whatsappService.SendTextMessageAsync(from, $"Olá {contactName}! No momento não temos serviços disponíveis para agendamento.", ct);
                return;
            }

            var buttons = services.Take(3).Select(s => new
            {
                type = "reply",
                reply = new
                {
                    id = s.Id.ToString(),
                    title = s.Name.Length > 20 ? s.Name.Substring(0, 17) + "..." : s.Name
                }
            }).ToList();

            var interactive = new
            {
                type = "button",
                header = new { type = "text", text = session.TenantName },
                body = new { text = $"Olá {contactName}! Bem-vindo ao {session.TenantName}. Qual serviço você gostaria de agendar?" },
                action = new { buttons }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, ct);
            session.State = "AWAITING_SERVICE";
        }

        private async Task HandleServiceSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? serviceIdStr = null;
            if (message.Type == "interactive" && message.Interactive?.ButtonReply != null)
                serviceIdStr = message.Interactive.ButtonReply.Id;
            else if (message.Type == "text")
            {
                // Simple text matching fallback could be implemented here
                await _whatsappService.SendTextMessageAsync(from, "Por favor, selecione um dos serviços clicando nos botões acima.", ct);
                return;
            }

            if (Guid.TryParse(serviceIdStr, out var serviceId))
            {
                session.ServiceId = serviceId;
                var services = await _publicBookingService.GetServicesByTenantAsync(session.TenantSlug!);
                session.ServiceName = services.FirstOrDefault(s => s.Id == serviceId)?.Name ?? "Serviço";

                var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, serviceId);

                if (!employees.Any())
                {
                    // No specific employees, skip to date
                    session.EmployeeId = null;
                    session.State = "AWAITING_DATE";
                    await AskForDateAsync(from, session, ct);
                    return;
                }

                var buttons = new List<object>
                {
                    new { type = "reply", reply = new { id = "any", title = "Tanto faz" } }
                };

                buttons.AddRange(employees.Take(2).Select(e => new
                {
                    type = "reply",
                    reply = new
                    {
                        id = e.Id.ToString(),
                        title = e.Name.Length > 20 ? e.Name.Substring(0, 17) + "..." : e.Name
                    }
                }));

                var interactive = new
                {
                    type = "button",
                    body = new { text = $"Ótima escolha! Com qual profissional você prefere ser atendido?" },
                    action = new { buttons }
                };

                await _whatsappService.SendInteractiveMessageAsync(from, interactive, ct);
                session.State = "AWAITING_EMPLOYEE";
            }
        }

        private async Task HandleEmployeeSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? employeeIdStr = null;
            if (message.Type == "interactive" && message.Interactive?.ButtonReply != null)
                employeeIdStr = message.Interactive.ButtonReply.Id;

            if (employeeIdStr == "any")
            {
                session.EmployeeId = null;
                session.EmployeeName = "Qualquer profissional";
            }
            else if (Guid.TryParse(employeeIdStr, out var employeeId))
            {
                session.EmployeeId = employeeId;
                var employees = await _publicBookingService.GetEmployeesByServiceAsync(session.TenantSlug!, session.ServiceId!.Value);
                session.EmployeeName = employees.FirstOrDefault(e => e.Id == employeeId)?.Name ?? "Profissional";
            }
            else
            {
                await _whatsappService.SendTextMessageAsync(from, "Por favor, selecione um profissional nos botões.", ct);
                return;
            }

            session.State = "AWAITING_DATE";
            await AskForDateAsync(from, session, ct);
        }

        private async Task AskForDateAsync(string from, BookingSession session, CancellationToken ct)
        {
            var dates = Enumerable.Range(0, 5).Select(i => DateTime.Today.AddDays(i)).ToList();

            var buttons = dates.Take(3).Select(d => new
            {
                type = "reply",
                reply = new
                {
                    id = d.ToString("yyyy-MM-dd"),
                    title = d.ToString("dd/MM") + (d == DateTime.Today ? " (Hoje)" : "")
                }
            }).ToList();

            var interactive = new
            {
                type = "button",
                body = new { text = "Para qual data você gostaria de agendar?" },
                action = new { buttons }
            };

            await _whatsappService.SendInteractiveMessageAsync(from, interactive, ct);
        }

        private async Task HandleDateSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? dateStr = null;
            if (message.Type == "interactive" && message.Interactive?.ButtonReply != null)
                dateStr = message.Interactive.ButtonReply.Id;

            if (DateTime.TryParseExact(dateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                session.SelectedDate = date;

                var slots = await _publicBookingService.GetAvailableSlotsAsync(session.TenantSlug!, date, session.ServiceId!.Value, session.EmployeeId);
                var availableSlots = slots.Where(s => s.IsAvailable).Take(10).ToList();

                if (!availableSlots.Any())
                {
                    await _whatsappService.SendTextMessageAsync(from, "Desculpe, não há horários disponíveis para esta data. Por favor, escolha outro dia.", ct);
                    await AskForDateAsync(from, session, ct);
                    return;
                }

                var rows = availableSlots.Select(s => new
                {
                    id = s.StartTime.ToString("HH:mm"),
                    title = s.StartTime.ToString("HH:mm"),
                    description = "Horário disponível"
                }).ToList();

                var interactive = new
                {
                    type = "list",
                    header = new { type = "text", text = session.TenantName },
                    body = new { text = "Selecione o melhor horário para você:" },
                    action = new
                    {
                        button = "Ver horários",
                        sections = new[]
                        {
                            new { title = "Horários Disponíveis", rows }
                        }
                    }
                };

                await _whatsappService.SendInteractiveMessageAsync(from, interactive, ct);
                session.State = "AWAITING_TIME";
            }
            else
            {
                await _whatsappService.SendTextMessageAsync(from, "Por favor, escolha uma data válida clicando nos botões.", ct);
            }
        }

        private async Task HandleTimeSelectionAsync(string from, WhatsappMessageDto message, BookingSession session, CancellationToken ct)
        {
            string? timeStr = null;
            if (message.Type == "interactive" && message.Interactive?.ListReply != null)
                timeStr = message.Interactive.ListReply.Id;

            if (!string.IsNullOrEmpty(timeStr))
            {
                session.SelectedTime = timeStr;

                var summary = $"*Resumo do Agendamento*\n\n" +
                              $"*Serviço:* {session.ServiceName}\n" +
                              $"*Profissional:* {session.EmployeeName ?? "Qualquer"}\n" +
                              $"*Data:* {session.SelectedDate:dd/MM/yyyy}\n" +
                              $"*Horário:* {timeStr}\n\n" +
                              $"Podemos confirmar este agendamento?";

                var buttons = new[]
                {
                    new { type = "reply", reply = new { id = "confirm", title = "Confirmar ✅" } },
                    new { type = "reply", reply = new { id = "cancel", title = "Cancelar ❌" } }
                };

                var interactive = new
                {
                    type = "button",
                    body = new { text = summary },
                    action = new { buttons }
                };

                await _whatsappService.SendInteractiveMessageAsync(from, interactive, ct);
                session.State = "AWAITING_CONFIRMATION";
            }
        }

        private async Task HandleConfirmationAsync(string from, WhatsappMessageDto message, string contactName, BookingSession session, CancellationToken ct)
        {
            string? choice = null;
            if (message.Type == "interactive" && message.Interactive?.ButtonReply != null)
                choice = message.Interactive.ButtonReply.Id;

            if (choice == "confirm")
            {
                var scheduledDateTime = session.SelectedDate!.Value.Add(TimeSpan.Parse(session.SelectedTime!));
                var scheduledDateTimeOffset = new DateTimeOffset(scheduledDateTime, TimeSpan.FromHours(-3));

                var dto = new PublicBookingCreateDto
                {
                    TenantSlug = session.TenantSlug!,
                    ClientName = contactName,
                    ClientPhone = from,
                    Description = "Agendado via WhatsApp Bot",
                    ServiceId = session.ServiceId!.Value,
                    EmployeeId = session.EmployeeId,
                    ScheduledDateTime = scheduledDateTimeOffset
                };

                var result = await _publicBookingService.CreateBookingAsync(dto);

                if (result.Success)
                {
                    await _whatsappService.SendTextMessageAsync(from, $"✅ *Agendamento Confirmado!*\n\n{contactName}, seu horário para {session.ServiceName} em *{session.TenantName}* foi marcado para o dia {session.SelectedDate:dd/MM} às {session.SelectedTime}. Esperamos por você!", ct);
                }
                else
                {
                    await _whatsappService.SendTextMessageAsync(from, "Desculpe, não conseguimos concluir seu agendamento. Por favor, tente novamente.", ct);
                }
                session.State = "COMPLETED";
            }
            else
            {
                await _whatsappService.SendTextMessageAsync(from, "Agendamento cancelado. Se precisar de algo mais, é só chamar!", ct);
                session.State = "COMPLETED";
            }
        }
    }
}
