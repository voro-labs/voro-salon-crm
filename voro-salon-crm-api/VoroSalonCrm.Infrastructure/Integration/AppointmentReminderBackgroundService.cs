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
            var window24hStart = now.AddHours(23).AddMinutes(50); // 23h50 de antecedência
            var window24hEnd = now.AddHours(24).AddMinutes(10);   // 24h10 de antecedência

            // Busca agendamentos confirmados ou pendentes, dentro da janela de 24h,
            // que ainda não receberam o lembrete
            var appointments = await db.Appointments
                .Include(a => a.Client)
                .Include(a => a.Service)
                .Include(a => a.Tenant)
                .Where(a =>
                    !a.IsDeleted &&
                    a.Reminder24hSentAt == null &&
                    (a.Status == AppointmentStatus.Pending || a.Status == AppointmentStatus.Confirmed) &&
                    a.ScheduledDateTime >= window24hStart &&
                    a.ScheduledDateTime <= window24hEnd &&
                    a.Client.Phone != null)
                .ToListAsync(ct);

            if (appointments.Count == 0) return;

            logger.LogInformation("Sending 24h reminders for {Count} appointments.", appointments.Count);

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

                    var message =
                        $"Olá, {appointment.Client.Name}! 👋\n\n" +
                        $"Lembrando que você tem um agendamento amanhã:\n\n" +
                        $"📅 *{dateStr}* às *{timeStr}*\n" +
                        $"✂️ {serviceName}\n" +
                        $"📍 {salonName}\n\n" +
                        $"Até lá! 😊";

                    var sent = await whatsapp.SendTextMessageAsync(phone, message, ct: ct);

                    if (sent)
                    {
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
