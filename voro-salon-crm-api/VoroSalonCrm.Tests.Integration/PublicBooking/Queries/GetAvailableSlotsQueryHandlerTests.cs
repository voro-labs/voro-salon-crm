using System.Linq.Expressions;
using FluentAssertions;
using Moq;
using VoroSalonCrm.Application.Features.PublicBooking.Queries;
using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Tests.Integration.Helpers;

namespace VoroSalonCrm.Tests.Integration.PublicBooking.Queries;

public class GetAvailableSlotsQueryHandlerTests
{
    private static IQueryable<T> AsyncQueryable<T>(IEnumerable<T> source)
        => new TestAsyncEnumerable<T>(source);

    // ── Test 1: tenant not found ───────────────────────────────────────────────

    [Fact]
    public async Task Handle_WhenTenantNotFound_ReturnsEmptyList()
    {
        // Arrange
        var tenantRepo = new Mock<ITenantRepository>();
        tenantRepo.Setup(r => r.GetBySlugAsync(It.IsAny<string>())).ReturnsAsync((Tenant?)null);

        var serviceRepo      = new Mock<IServiceRepository>();
        var businessHoursRepo = new Mock<ITenantBusinessHoursRepository>();
        var appointmentRepo  = new Mock<IAppointmentRepository>();
        var blockRepo        = new Mock<ITimeSlotBlockRepository>();
        var employeeRepo     = new Mock<IEmployeeRepository>();

        var handler = new GetAvailableSlotsQueryHandler(
            tenantRepo.Object,
            serviceRepo.Object,
            businessHoursRepo.Object,
            appointmentRepo.Object,
            blockRepo.Object,
            employeeRepo.Object);

        var query = new GetAvailableSlotsQuery("unknown-slug", DateTime.Today);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }

    // ── Test 2: day is closed ─────────────────────────────────────────────────

    [Fact]
    public async Task Handle_WhenDayIsClosed_ReturnsEmptyList()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        var testDate = new DateTime(2026, 5, 15); // Friday

        var tenantRepo = new Mock<ITenantRepository>();
        tenantRepo
            .Setup(r => r.GetBySlugAsync("my-salon"))
            .ReturnsAsync(new Tenant { Id = tenantId, Name = "My Salon", Slug = "my-salon", IsActive = true });

        var businessHoursRepo = new Mock<ITenantBusinessHoursRepository>();
        businessHoursRepo
            .Setup(r => r.GetByTenantAsync(tenantId, It.IsAny<bool>()))
            .ReturnsAsync(new List<TenantBusinessHours>
            {
                new()
                {
                    DayOfWeek = (int)testDate.DayOfWeek,
                    IsOpen = false,
                    Ranges = new List<TenantBusinessHoursRange>()
                }
            });

        var serviceRepo     = new Mock<IServiceRepository>();
        var appointmentRepo = new Mock<IAppointmentRepository>();
        var blockRepo       = new Mock<ITimeSlotBlockRepository>();
        var employeeRepo    = new Mock<IEmployeeRepository>();

        var handler = new GetAvailableSlotsQueryHandler(
            tenantRepo.Object,
            serviceRepo.Object,
            businessHoursRepo.Object,
            appointmentRepo.Object,
            blockRepo.Object,
            employeeRepo.Object);

        var query = new GetAvailableSlotsQuery("my-salon", testDate);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        result.Should().BeEmpty();
    }

    // ── Test 3: no appointments, one employee → available slots returned ───────

    [Fact]
    public async Task Handle_WhenNoAppointmentsAndOneEmployee_ReturnsAvailableSlots()
    {
        // Arrange
        var tenantId = Guid.NewGuid();
        // Use a future date (not today) so past-slot skipping logic does not trim the range
        var testDate = new DateTime(2027, 1, 4); // Monday

        var tenantRepo = new Mock<ITenantRepository>();
        tenantRepo
            .Setup(r => r.GetBySlugAsync("my-salon"))
            .ReturnsAsync(new Tenant { Id = tenantId, Name = "My Salon", Slug = "my-salon", IsActive = true });

        var businessHoursRepo = new Mock<ITenantBusinessHoursRepository>();
        businessHoursRepo
            .Setup(r => r.GetByTenantAsync(tenantId, It.IsAny<bool>()))
            .ReturnsAsync(new List<TenantBusinessHours>
            {
                new()
                {
                    DayOfWeek = (int)testDate.DayOfWeek,
                    IsOpen = true,
                    Ranges = new List<TenantBusinessHoursRange>
                    {
                        new() { OpenTime = "08:00", CloseTime = "18:00", SortOrder = 0 }
                    }
                }
            });

        var appointmentRepo = new Mock<IAppointmentRepository>();
        appointmentRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Appointment, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncQueryable(Array.Empty<Appointment>()));

        var blockRepo = new Mock<ITimeSlotBlockRepository>();
        blockRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<TimeSlotBlock, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncQueryable(Array.Empty<TimeSlotBlock>()));

        var employeeRepo = new Mock<IEmployeeRepository>();
        employeeRepo
            .Setup(r => r.Query(It.IsAny<Expression<Func<Employee, bool>>>(), It.IsAny<bool>()))
            .Returns(AsyncQueryable(new List<Employee> { new() { Id = Guid.NewGuid(), TenantId = tenantId, Name = "Ana", IsActive = true } }));

        var serviceRepo = new Mock<IServiceRepository>();

        var handler = new GetAvailableSlotsQueryHandler(
            tenantRepo.Object,
            serviceRepo.Object,
            businessHoursRepo.Object,
            appointmentRepo.Object,
            blockRepo.Object,
            employeeRepo.Object);

        var query = new GetAvailableSlotsQuery("my-salon", testDate);

        // Act
        var result = (await handler.Handle(query, CancellationToken.None)).ToList();

        // Assert
        result.Should().NotBeEmpty();
        result.Should().AllSatisfy(slot => slot.IsAvailable.Should().BeTrue());
    }
}
