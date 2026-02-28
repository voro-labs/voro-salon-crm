using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Infrastructure.Repositories.Base;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class NotificationRepository(JasmimDbContext context, IUnitOfWork unitOfWork) : RepositoryBase<Notification>(context, unitOfWork), INotificationRepository
    {

    }
}
