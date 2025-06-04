using backend.AccountComponent.Dataaccess.Api.Entity;

namespace backend.AccountComponent.Dataaccess.Api.Repo;

public interface IAccountRepository
{
    Task<int> SaveAsync(Account account);
    Task<Account?> GetByNameAsync(string name);
    Task<int> DeleteAsync(int id);
}