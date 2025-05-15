using backend.AccountCompoment.Dataaccess.Api.Entity;

namespace backend.AccountCompoment.Dataaccess.Api.Repo;

public interface IAccountRepository
{
    Task<int> SaveAsync(Account account);
    Task<Account?> GetByNameAsync(string name);
    Task<int> DeleteAsync(int id);
}