using VoroSwipeEntertainment.Domain.Interfaces.Repositories.Base;
using System.Linq.Expressions;
using VoroSwipeEntertainment.Application.Services.Interfaces.Base;

namespace VoroSwipeEntertainment.Application.Services.Base
{
    public class ServiceBase<T>(IRepositoryBase<T> repository) : IServiceBase<T> where T : class
    {
        private readonly IRepositoryBase<T> _repository = repository;

        public Task<IEnumerable<T>> GetAllAsync(bool asNoTracking = true)
            => _repository.GetAllAsync(asNoTracking);

        public Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate, bool asNoTracking = true, params Func<IQueryable<T>, IQueryable<T>>[] includes)
            => _repository.GetAllAsync(predicate, asNoTracking, includes);

        public Task<T?> GetByIdAsync(params object[] keyValues)
            => _repository.GetByIdAsync(keyValues);

        public Task<T?> GetByIdAsync(Expression<Func<T, bool>> predicate, params Func<IQueryable<T>, IQueryable<T>>[] includes)
            => _repository.GetByIdAsync(predicate, includes);

        public IQueryable<T> Query(Expression<Func<T, bool>>? predicate = null, bool asNoTracking = true)
            => _repository.Query(predicate, asNoTracking);

        public IQueryable<T> Include(params Expression<Func<T, object>>[] includes)
            => _repository.Include(includes);

        public Task AddAsync(T entity)
            => _repository.AddAsync(entity);

        public Task AddRangeAsync(IEnumerable<T> entities)
            => _repository.AddRangeAsync(entities);

        public void Update(T entity)
            => _repository.Update(entity);

        public void UpdateRange(IEnumerable<T> entities)
            => _repository.UpdateRange(entities);

        public Task DeleteAsync(params object[] keyValues)
            => _repository.DeleteAsync(keyValues);

        public void Delete(T entity)
            => _repository.Delete(entity);
        public void DeleteRange(IEnumerable<T> entities)
            => _repository.DeleteRange(entities);

        public Task<int> SaveChangesAsync()
            => _repository.SaveChangesAsync();
    }
}
