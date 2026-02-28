using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using VoroSalonCrm.Infrastructure.Factories;
using VoroSalonCrm.Domain.Interfaces.UnitOfWork;

namespace VoroSalonCrm.Infrastructure.UnitOfWork
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly JasmimDbContext _context;
        private IDbContextTransaction? _transaction;
        private bool _disposed;
        
        public JasmimDbContext Context => _context;

        public UnitOfWork(JasmimDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        private void ThrowIfDisposed()
        {
            if (_disposed)
                throw new ObjectDisposedException(nameof(UnitOfWork));
        }

        public int SaveChanges()
        {
            ThrowIfDisposed();
            return _context.SaveChanges();
        }

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ThrowIfDisposed();
            return _context.SaveChangesAsync(cancellationToken);
        }

        public IDbContextTransaction BeginTransaction()
        {
            ThrowIfDisposed();

            if (_transaction != null)
                return _transaction;

            _transaction = _context.Database.BeginTransaction();
            return _transaction;
        }

        public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        {
            ThrowIfDisposed();

            if (_transaction != null)
                return _transaction;

            _transaction = await _context.Database.BeginTransactionAsync(cancellationToken).ConfigureAwait(false);
            return _transaction;
        }

        public async Task CommitAsync(CancellationToken cancellationToken = default)
        {
            ThrowIfDisposed();

            if (_transaction == null)
            {
                // Sem transação explícita, apenas salva as alterações.
                await SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                return;
            }

            try
            {
                await SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                await _transaction.CommitAsync(cancellationToken).ConfigureAwait(false);
            }
            finally
            {
                await DisposeTransactionAsync().ConfigureAwait(false);
            }
        }

        public async Task RollbackAsync(CancellationToken cancellationToken = default)
        {
            ThrowIfDisposed();

            if (_transaction == null)
                return;

            try
            {
                await _transaction.RollbackAsync(cancellationToken).ConfigureAwait(false);
            }
            finally
            {
                await DisposeTransactionAsync().ConfigureAwait(false);
            }
        }

        private async Task DisposeTransactionAsync()
        {
            if (_transaction != null)
            {
                await _transaction.DisposeAsync().ConfigureAwait(false);
                _transaction = null;
            }
        }

        private void DisposeTransaction()
        {
            if (_transaction != null)
            {
                _transaction.Dispose();
                _transaction = null;
            }
        }

        public void Dispose()
        {
            if (_disposed) return;

            DisposeTransaction();
            _context.Dispose();
            _disposed = true;
            GC.SuppressFinalize(this);
        }

        public void ClearTracker()
        {
            _context.ChangeTracker.Entries().ToList().ForEach(e => e.State = EntityState.Detached);
        }

        public async ValueTask DisposeAsync()
        {
            if (_disposed) return;

            if (_transaction != null)
            {
                await _transaction.DisposeAsync().ConfigureAwait(false);
                _transaction = null;
            }

            await _context.DisposeAsync().ConfigureAwait(false);
            _disposed = true;
            GC.SuppressFinalize(this);
        }
    }
}
