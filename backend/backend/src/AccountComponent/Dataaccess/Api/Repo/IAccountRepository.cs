using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Entity;

namespace backend.AccountComponent.Dataaccess.Api.Repo;

public interface IAccountRepository
{
    Task<int> SaveAsync(Account account);
    Task<AccountRetrieveDto?> GetByNameAsync(string name);
    Task<AccountRetrieveDto?> GetByIdAsync(int id);
    Task<int> DeleteAsync(int id);
}