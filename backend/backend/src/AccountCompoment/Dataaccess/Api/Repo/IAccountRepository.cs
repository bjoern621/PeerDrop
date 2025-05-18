using backend.AccountCompoment.Common.DTOs;
using backend.AccountCompoment.Dataaccess.Api.Entity;

namespace backend.AccountCompoment.Dataaccess.Api.Repo;

public interface IAccountRepository
{
    Task<int> SaveAsync(Account account);
    Task<AccountCreateDto?> GetByNameAsync(string name);
    Task<int> DeleteAsync(int id);
}