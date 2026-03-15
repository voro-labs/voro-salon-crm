using VoroSalonCrm.Domain.Entities;
using VoroSalonCrm.Domain.Interfaces.Repositories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Infrastructure.Repositories.Base;

namespace VoroSalonCrm.Infrastructure.Repositories
{
    public class AnamnesisSheetRepository(JasmimDbContext context, IUnitOfWork unitOfWork)
        : RepositoryBase<AnamnesisSheet>(context, unitOfWork), IAnamnesisSheetRepository
    {
    }
}
