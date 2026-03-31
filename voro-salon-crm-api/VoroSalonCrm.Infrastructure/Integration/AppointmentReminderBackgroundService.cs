using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using VoroSalonCrm.Application.Services.Interfaces.Integration;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Integration
{
    /// <summary>
    /// Serviço de background que verifica a cada 10 minutos se há agendamentos
    /// que precisam de um lembrete de 24h via WhatsApp e os envia.
    /// </summary>
    public class AppointmentReminderBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<AppointmentReminderBackgroundService> logger) : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(10);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("AppointmentReminderBackgroundService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessRemindersAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error processing appointment reminders.");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task ProcessRemindersAsync(CancellationToken ct)
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<JasmimDbContext>();
            var whatsapp = scope.ServiceProvider.GetRequiredService<IWhatsappService>();

            var now = DateTimeOffset.UtcNow;

            // Busca agendamentos confirmados ou pendentes que precisam de lembrete.
            // Regra: (ScheduledDateTime - ReminderMinutes) <= agora E ReminderSentAt == null
            // Também mantemos a lógica de 24h para agendamentos que não tem ReminderMinutes definido (legado/padrão)
            
            var appointments = await db.Appointments
                .Include(a => a.Client)
                .Include(a => a.Service)
                .Include(a => a.Tenant)
                .Where(a =>
                    !a.IsDeleted &&
                    (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed) &&
                    a.Client.Phone != null &&
                    a.ScheduledDateTime > now && // agendamento no futuro
                    (
                        // Caso 1: Tem ReminderMinutes definido e chegou a hora (janela de 15 min para não perder o timing)
                        (a.ReminderMinutes.HasValue && a.ReminderSentAt == null && 
                         a.ScheduledDateTime.AddMinutes(-a.ReminderMinutes.Value) <= now &&
                         a.ScheduledDateTime.AddMinutes(-a.ReminderMinutes.Value) >= now.AddMinutes(-15))
                        ||
                        // Caso 2: Legado/24h (se ReminderMinutes for null ou se for exatamente 1440)
                        (!a.ReminderMinutes.HasValue && a.Reminder24hSentAt == null &&
                         a.ScheduledDateTime <= now.AddHours(24).AddMinutes(5) &&
                         a.ScheduledDateTime >= now.AddHours(23).AddMinutes(55))
                    ))
                .ToListAsync(ct);

            if (appointments.Count == 0) return;

            logger.LogInformation("Sending reminders for {Count} appointments.", appointments.Count);

            foreach (var appointment in appointments)
            {
                try
                {
                    var phone = appointment.Client.Phone!.TrimStart('+');
                    var localTime = appointment.ScheduledDateTime.ToOffset(TimeSpan.FromHours(-3));
                    var dateStr = localTime.ToString("dd/MM/yyyy");
                    var timeStr = localTime.ToString("HH:mm");
                    var serviceName = appointment.Service?.Name ?? "seu serviço";
                    var salonName = appointment.Tenant?.Name ?? "o estabelecimento";

                    string message;
                    if (appointment.ReminderMinutes.HasValue && appointment.ReminderMinutes.Value < 1440)
                    {
                        var timeDesc = appointment.ReminderMinutes.Value switch
                        {
                            >= 60 => $"{appointment.ReminderMinutes.Value / 60} hora(s)",
                            _ => $"{appointment.ReminderMinutes.Value} minutos"
                        };
                        message = $"Olá, {appointment.Client.Name}! 👋\n\nPassando para lembrar do seu agendamento daqui a *{timeDesc}*:\n\n📅 *{dateStr}* às *{timeStr}*\n✂️ {serviceName}\n📍 {salonName}\n\nAté logo! 😊";
                    }
                    else
                    {
                        message = $"Olá, {appointment.Client.Name}! 👋\n\nLembrando que você tem um agendamento amanhã:\n\n📅 *{dateStr}* às *{timeStr}*\n✂️ {serviceName}\n📍 {salonName}\n\nAté lá! 😊";
                    }

                    var sent = await whatsapp.SendTextMessageAsync(phone, message, ct: ct);

                    if (sent)
                    {
                        if (appointment.ReminderMinutes.HasValue)
                            appointment.ReminderSentAt = now;
                        else
                            appointment.Reminder24hSentAt = now;
                            
                        db.Appointments.Update(appointment);
                        logger.LogInformation("Reminder sent for appointment {Id}.", appointment.Id);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to send reminder for appointment {Id}.", appointment.Id);
                }
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
