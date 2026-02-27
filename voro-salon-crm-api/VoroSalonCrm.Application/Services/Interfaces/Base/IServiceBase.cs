using System.Linq.Expressions;

namespace VoroSwipeEntertainment.Application.Services.Interfaces.Base
{
    public interface IServiceBase<T> where T : class
    {
        Task<IEnumerable<T>> GetAllAsync(bool asNoTracking = true);
        Task<IEnumerable<T>> GetAllAsync(Expression<Func<T, bool>> predicate, bool asNoTracking = true, params Func<IQueryable<T>, IQueryable<T>>[] includes);
        Task<T?> GetByIdAsync(params object[] keyValues);
        Task<T?> GetByIdAsync(Expression<Func<T, bool>> predicate, params Func<IQueryable<T>, IQueryable<T>>[] includes);
        IQueryable<T> Query(Expression<Func<T, bool>>? predicate = null, bool asNoTracking = true);
        IQueryable<T> Include(params Expression<Func<T, object>>[] includes);

        Task AddAsync(T entity);
        Task AddRangeAsync(IEnumerable<T> entities);
        void Update(T entity);
        void UpdateRange(IEnumerable<T> entities);
        Task DeleteAsync(params object[] keyValues);
        void Delete(T entity);
        void DeleteRange(IEnumerable<T> entities);

        Task<int> SaveChangesAsync();
    }
}
