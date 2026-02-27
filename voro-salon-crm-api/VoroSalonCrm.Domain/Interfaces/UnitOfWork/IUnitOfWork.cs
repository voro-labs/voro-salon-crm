using Microsoft.EntityFrameworkCore.Storage;

namespace VoroSwipeEntertainment.Domain.Interfaces.UnitOfWork
{
    public interface IUnitOfWork : IDisposable, IAsyncDisposable
    {
        int SaveChanges();
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

        IDbContextTransaction BeginTransaction();
        Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);

        Task CommitAsync(CancellationToken cancellationToken = default);
        Task RollbackAsync(CancellationToken cancellationToken = default);
        void ClearTracker();
    }
}
