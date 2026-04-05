using Microsoft.EntityFrameworkCore;
using VoroSalonCrm.Application.DTOs.CRM;
using VoroSalonCrm.Application.Services.Interfaces;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Enums;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Seeds
{
    public class DemoResetService(JasmimDbContext context) : IDemoResetService
    {
        public async Task ResetAsync()
        {
            var demoTenants = await context.Tenants
                .IgnoreQueryFilters()
                .Where(t => t.IsDemo)
                .OrderBy(t => t.Slug)
                .ToListAsync();

            for (int i = 0; i < demoTenants.Count; i++)
            {
                var tenantId = demoTenants[i].Id;
                await DeleteDemoDataAsync(tenantId);
                await SeedDemoDefaultsAsync(tenantId, i);
            }

            await context.SaveChangesAsync();
        }

        private async Task DeleteDemoDataAsync(Guid tenantId)
        {
            // Anamnese: filhos primeiro
            var sheetIds = await context.AnamnesisSheets
                .IgnoreQueryFilters()
                .Where(s => s.TenantId == tenantId)
                .Select(s => s.Id)
                .ToListAsync();

            if (sheetIds.Count > 0)
            {
                await context.AnamnesisSignatures
                    .IgnoreQueryFilters()
                    .Where(x => sheetIds.Contains(x.SheetId))
                    .ExecuteDeleteAsync();

                await context.AnamnesisEvidences
                    .IgnoreQueryFilters()
                    .Where(x => sheetIds.Contains(x.SheetId))
                    .ExecuteDeleteAsync();

                await context.AnamnesisResponses
                    .IgnoreQueryFilters()
                    .Where(x => sheetIds.Contains(x.SheetId))
                    .ExecuteDeleteAsync();

                await context.AnamnesisSheets
                    .IgnoreQueryFilters()
                    .Where(s => s.TenantId == tenantId)
                    .ExecuteDeleteAsync();
            }

            await context.AnamnesisQuestions
                .IgnoreQueryFilters()
                .Where(q => q.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.ServiceRecords
                .IgnoreQueryFilters()
                .Where(r => r.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.Appointments
                .IgnoreQueryFilters()
                .Where(a => a.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.Transactions
                .IgnoreQueryFilters()
                .Where(t => t.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.TransactionCategories
                .IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId)
                .ExecuteDeleteAsync();

            var employeeIds = await context.Employees
                .IgnoreQueryFilters()
                .Where(e => e.TenantId == tenantId)
                .Select(e => e.Id)
                .ToListAsync();

            if (employeeIds.Count > 0)
            {
                await context.EmployeeServices
                    .Where(es => employeeIds.Contains(es.EmployeeId))
                    .ExecuteDeleteAsync();

                await context.Employees
                    .IgnoreQueryFilters()
                    .Where(e => e.TenantId == tenantId)
                    .ExecuteDeleteAsync();
            }

            await context.Services
                .IgnoreQueryFilters()
                .Where(s => s.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.Clients
                .IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId)
                .ExecuteDeleteAsync();

            await context.UserNotifications
                .IgnoreQueryFilters()
                .Where(c => c.TenantId == tenantId)
                .ExecuteDeleteAsync();
        }

        // ─── Dados por tenant (índice 0 = vorostarter, 1 = voropro, 2 = voropremium) ───

        private static readonly string[][] ClientNamesByTenant =
        [
            // 0 – starter (10 clientes)
            [
                "Ana Beatriz Santos", "Bruno Carvalho", "Camila Ferreira",
                "Diego Oliveira", "Eduarda Lima", "Felipe Souza",
                "Gabriela Nunes", "Henrique Costa", "Isabela Mendes",
                "João Victor Rocha"
            ],
            // 1 – pro (12 clientes)
            [
                "Karla Ribeiro", "Lucas Martins", "Mariana Alves",
                "Nathan Pereira", "Odete Barros", "Paulo Henrique Silva",
                "Quezia Monteiro", "Rafael Gomes", "Sabrina Teixeira",
                "Thiago Azevedo", "Úrsula Machado", "Vinícius Castro"
            ],
            // 2 – premium (14 clientes)
            [
                "Wendy Corrêa", "Xisto Fernandes", "Yasmin Pinto",
                "Zélia Rodrigues", "Amanda Freitas", "Bernardo Lopes",
                "Cecília Borges", "Daniel Morais", "Elena Ribeiro",
                "Fábio Cunha", "Glória Magalhães", "Hugo Saraiva",
                "Ingrid Tavares", "Jefferson Guimarães"
            ]
        ];

        private static readonly string[][] EmployeeNamesByTenant =
        [
            // 0 – starter (3 funcionários)
            [ "Márcia Vidal", "Carlos Eduardo Ramos", "Patrícia Cristina Lima" ],
            // 1 – pro (5 funcionários)
            [ "Fernanda Moraes", "Gustavo Henrique Sousa", "Priscila Almeida", "Renato Batista", "Simone Cavalcanti" ],
            // 2 – premium (5 funcionários)
            [ "Alexandre Melo", "Beatriz Duarte", "Cláudio Andrade", "Eliane Peixoto", "Marcos Vinícius Santos" ]
        ];

        // Serviços: (nome, duração em minutos, preços por tenant [starter, pro, premium])
        private static readonly (string Name, int Duration, decimal[] Prices)[] ServiceCatalog =
        [
            ("Corte Feminino",        60,  [ 70m,  80m, 110m ]),
            ("Corte Masculino",       30,  [ 40m,  50m,  70m ]),
            ("Coloração",            120,  [130m, 150m, 200m ]),
            ("Escova Progressiva",   120,  [180m, 210m, 280m ]), // 180 -> 120
            ("Hidratação Profunda",   45,  [ 55m,  65m,  90m ]),
            ("Escova",                45,  [ 50m,  60m,  80m ]),
            ("Manicure",              45,  [ 30m,  35m,  50m ]), // 40 -> 45
            ("Pedicure",              45,  [ 35m,  45m,  65m ]), // 50 -> 45
            ("Design de Sobrancelha", 30,  [ 25m,  30m,  45m ]),
            ("Luzes / Mechas",       120,  [160m, 190m, 250m ]), // 150 -> 120
            ("Tratamento Capilar",    60,  [ 70m,  85m, 120m ]),
            ("Maquiagem",             60,  [ 90m, 110m, 160m ])
        ];

        private async Task SeedDemoDefaultsAsync(Guid tenantId, int tenantIndex)
        {
            var idx = Math.Clamp(tenantIndex, 0, 2);
            var now = DateTimeOffset.UtcNow;
            var today = now.Date;

            // ── Serviços ──────────────────────────────────────────────────────────
            var services = ServiceCatalog.Select(s => new Service
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = s.Name,
                Price = s.Prices[idx],
                DurationMinutes = s.Duration,
                CreatedAt = now
            }).ToList();

            await context.Services.AddRangeAsync(services);

            // ── Funcionários ──────────────────────────────────────────────────────
            var employeeNames = EmployeeNamesByTenant[idx];
            var employees = employeeNames.Select(name => new Employee
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = name,
                IsActive = true,
                HireDate = now.AddMonths(-6),
                CreatedAt = now
            }).ToList();

            await context.Employees.AddRangeAsync(employees);

            // Especialidades: cada funcionário atende todos os serviços
            var specialties = new List<EmployeeService>();
            foreach (var emp in employees)
                foreach (var svc in services)
                    specialties.Add(new EmployeeService { EmployeeId = emp.Id, ServiceId = svc.Id });

            await context.EmployeeServices.AddRangeAsync(specialties);

            // ── Clientes ──────────────────────────────────────────────────────────
            var clientNames = ClientNamesByTenant[idx];
            var phoneBase = 11900000000L + (long)(idx + 1) * 1_000_000L;
            var clients = clientNames.Select((name, i) => new Client
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                Name = name,
                Phone = $"55{phoneBase + i:D11}",
                CreatedAt = now.AddDays(-60 + i * 3)
            }).ToList();

            await context.Clients.AddRangeAsync(clients);

            // ── Categorias de transação ───────────────────────────────────────────
            var catServicos   = new TransactionCategory { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Serviços",            Type = TransactionType.Income,  CreatedAt = now };
            var catProdutos   = new TransactionCategory { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Venda de Produtos",   Type = TransactionType.Income,  CreatedAt = now };
            var catAluguel    = new TransactionCategory { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Aluguel",             Type = TransactionType.Expense, CreatedAt = now };
            var catSalarios   = new TransactionCategory { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Salários",            Type = TransactionType.Expense, CreatedAt = now };
            var catMarketing  = new TransactionCategory { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Marketing",           Type = TransactionType.Expense, CreatedAt = now };
            var catMateriais  = new TransactionCategory { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Materiais e Insumos", Type = TransactionType.Expense, CreatedAt = now };
            var catContas     = new TransactionCategory { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Contas e Utilidades", Type = TransactionType.Expense, CreatedAt = now };

            await context.TransactionCategories.AddRangeAsync(catServicos, catProdutos, catAluguel, catSalarios, catMarketing, catMateriais, catContas);

            // ── Agendamentos e Transações de receita ──────────────────────────────
            var appointments = new List<Appointment>();
            var transactions = new List<Transaction>();
            var serviceRecords = new List<ServiceRecord>();

            // Agendamentos passados (Completed) – últimos 45 dias
            var pastSlots = new (int DaysAgo, int Hour)[]
            {
                (45, 9), (42, 10), (38, 14), (35, 11), (30, 15),
                (28, 9), (25, 16), (22, 10), (18, 13), (15, 11),
                (12, 14), (9, 10), (6, 15), (3, 9)
            };

            var payMethods = new[] { PaymentMethod.Pix, PaymentMethod.CreditCard, PaymentMethod.DebitCard, PaymentMethod.Cash };

            for (int i = 0; i < pastSlots.Length && i < clients.Count; i++)
            {
                var (daysAgo, hour) = pastSlots[i];
                var client = clients[i % clients.Count];
                var svc    = services[i % services.Count];
                var emp    = employees[i % employees.Count];
                var scheduled = new DateTimeOffset(today.AddDays(-daysAgo).Add(TimeSpan.FromHours(hour)), TimeSpan.FromHours(-3)).ToUniversalTime();
                var method = payMethods[i % payMethods.Length];

                var appt = new Appointment
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ClientId = client.Id,
                    ServiceId = svc.Id,
                    EmployeeId = emp.Id,
                    ScheduledDateTime = scheduled,
                    DurationMinutes = svc.DurationMinutes,
                    Amount = svc.Price,
                    Status = AppointmentStatus.Completed,
                    CreatedAt = scheduled.AddDays(-2)
                };

                #warning "A lógica de geração de histórico e comissão pode ser validada pelo claude code. Se estiver ok, pode ser movida para um método separado e reutilizada na finalização de agendamento real."
                if (appt.Status == AppointmentStatus.Completed)
                {
                    var historyDto = new ServiceRecord
                    {
                        ClientId = appt.ClientId,
                        TenantId = appt.TenantId,
                        ServiceId = appt.ServiceId,
                        AppointmentId = appt.Id,
                        ServiceDate = DateTimeOffset.UtcNow,
                        Description = appt.Description ?? "Serviço via agendamento",
                        Amount = appt.Amount,
                        Notes = $"Agendamento ID: {appt.Id}\nNotas: {appt.Notes}",
                        
                    };

                    serviceRecords.Add(historyDto);

                    // Gera comissão automaticamente se o funcionário tiver percentual configurado
                    if (appt.EmployeeId.HasValue && appt.Amount > 0)
                    {
                        if (emp?.CommissionPercentage is > 0)
                        {
                            var commissionAmount = Math.Round(appt.Amount * (emp.CommissionPercentage.Value / 100m), 2);
                            var dueDate = new DateTimeOffset(
                                appt.ScheduledDateTime.Year,
                                appt.ScheduledDateTime.Month,
                                DateTime.DaysInMonth(appt.ScheduledDateTime.Year, appt.ScheduledDateTime.Month),
                                23, 59, 59, TimeSpan.Zero);

                            var commissionTx = new Transaction
                            {
                                Id = Guid.NewGuid(),
                                TenantId = appt.TenantId,
                                Description = $"Comissão – {emp.Name} – {appt.Service?.Name ?? "Serviço"}",
                                Amount = commissionAmount,
                                PaidAmount = 0,
                                DueDate = dueDate,
                                Type = TransactionType.Expense,
                                PaymentMethod = PaymentMethod.Other,
                                Status = TransactionStatus.Pending,
                                EmployeeId = emp.Id,
                                Notes = $"Comissão de {emp.CommissionPercentage}% sobre agendamento {appt.Id}",
                                CreatedAt = DateTimeOffset.UtcNow
                            };

                            transactions.Add(commissionTx);
                        }
                    }
                }

                appointments.Add(appt);

                // Receita para cada agendamento concluído
                transactions.Add(new Transaction
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CategoryId = catServicos.Id,
                    Description = $"{svc.Name} – {client.Name}",
                    Amount = svc.Price,
                    PaidAmount = svc.Price,
                    DueDate = scheduled,
                    PaymentDate = scheduled.AddHours(1),
                    Type = TransactionType.Income,
                    PaymentMethod = method,
                    Status = TransactionStatus.Paid,
                    CreatedAt = scheduled
                });
            }

            // Agendamentos futuros (Confirmed / Pending) – próximos 14 dias
            var futureSlots = new (int DaysAhead, int Hour)[]
            {
                (1, 10), (2, 14), (3, 11), (5, 16), (7, 9),
                (8, 15), (10, 10), (12, 14), (14, 11)
            };

            for (int i = 0; i < futureSlots.Length && i < clients.Count; i++)
            {
                var (daysAhead, hour) = futureSlots[i];
                var client = clients[(i + 3) % clients.Count];
                var svc    = services[(i + 2) % services.Count];
                var emp    = employees[(i + 1) % employees.Count];
                var scheduled = new DateTimeOffset(today.AddDays(daysAhead).Add(TimeSpan.FromHours(hour)), TimeSpan.FromHours(-3)).ToUniversalTime();
                var status = i < 4 ? AppointmentStatus.Confirmed : AppointmentStatus.Pending;

                appointments.Add(new Appointment
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    ClientId = client.Id,
                    ServiceId = svc.Id,
                    EmployeeId = emp.Id,
                    ScheduledDateTime = scheduled,
                    DurationMinutes = svc.DurationMinutes,
                    Amount = svc.Price,
                    Status = status,
                    CreatedAt = now.AddDays(-1)
                });
            }

            await context.Appointments.AddRangeAsync(appointments);

            // ── Transações de despesa ─────────────────────────────────────────────
            decimal rentMult    = idx == 0 ? 1.0m : idx == 1 ? 1.4m : 2.0m;
            decimal salaryMult  = rentMult;

            var expenses = new List<(TransactionCategory Cat, string Desc, decimal Amount, int DaysAgo, PaymentMethod Method, TransactionStatus Status)>
            {
                (catAluguel,   "Aluguel – mês atual",          1_800m * rentMult,   5,  PaymentMethod.Boleto,     TransactionStatus.Paid),
                (catAluguel,   "Aluguel – mês anterior",       1_800m * rentMult,  35,  PaymentMethod.Boleto,     TransactionStatus.Paid),
                (catSalarios,  "Folha de pagamento",           4_500m * salaryMult,  3,  PaymentMethod.Other,      TransactionStatus.Paid),
                (catSalarios,  "Folha de pagamento anterior",  4_500m * salaryMult, 33,  PaymentMethod.Other,      TransactionStatus.Paid),
                (catMarketing,  "Anúncios redes sociais",        350m * rentMult,   8,  PaymentMethod.CreditCard, TransactionStatus.Paid),
                (catMateriais, "Tintas e produtos químicos",    620m * rentMult,   14,  PaymentMethod.Pix,        TransactionStatus.Paid),
                (catMateriais, "Esmaltes e acessórios",         280m * rentMult,   20,  PaymentMethod.Pix,        TransactionStatus.Paid),
                (catContas,    "Energia elétrica",              310m,              12,  PaymentMethod.Boleto,     TransactionStatus.Paid),
                (catContas,    "Internet e telefone",           150m,              10,  PaymentMethod.Boleto,     TransactionStatus.Paid),
                (catMarketing, "Criação de conteúdo",           500m * rentMult,   25,  PaymentMethod.Pix,        TransactionStatus.Paid),
                // despesas futuras / pendentes
                (catAluguel,   "Aluguel – próximo mês",        1_800m * rentMult,  -25, PaymentMethod.Boleto,     TransactionStatus.Pending),
                (catSalarios,  "Adiantamento salarial",        1_500m * salaryMult, -5, PaymentMethod.Pix,        TransactionStatus.Pending),
                (catMateriais, "Pedido de materiais",           450m * rentMult,   -3,  PaymentMethod.Pix,        TransactionStatus.Pending),
            };

            foreach (var (cat, desc, amount, daysAgo, method, status) in expenses)
            {
                var dueDate = new DateTimeOffset(today.AddDays(-daysAgo), TimeSpan.Zero);
                transactions.Add(new Transaction
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CategoryId = cat.Id,
                    Description = desc,
                    Amount = Math.Round(amount, 2),
                    PaidAmount = status == TransactionStatus.Paid ? Math.Round(amount, 2) : 0m,
                    DueDate = dueDate,
                    PaymentDate = status == TransactionStatus.Paid ? dueDate : null,
                    Type = TransactionType.Expense,
                    PaymentMethod = method,
                    Status = status,
                    CreatedAt = now
                });
            }

            // Venda de produtos (receita extra)
            var productSales = new (string Desc, decimal Value, int DaysAgo)[]
            {
                ("Shampoo + condicionador",   85m, 7),
                ("Kit tratamento capilar",   140m, 15),
                ("Máscara hidratante",        65m, 22),
                ("Óleo finalizador",          55m, 30),
            };

            foreach (var (desc, value, daysAgo) in productSales)
            {
                var saleDate = new DateTimeOffset(today.AddDays(-daysAgo), TimeSpan.Zero);
                transactions.Add(new Transaction
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId,
                    CategoryId = catProdutos.Id,
                    Description = desc,
                    Amount = Math.Round(value * rentMult, 2),
                    PaidAmount = Math.Round(value * rentMult, 2),
                    DueDate = saleDate,
                    PaymentDate = saleDate,
                    Type = TransactionType.Income,
                    PaymentMethod = PaymentMethod.Pix,
                    Status = TransactionStatus.Paid,
                    CreatedAt = now
                });
            }

            await context.Transactions.AddRangeAsync(transactions);
        }
    }
}
