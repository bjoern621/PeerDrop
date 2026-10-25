using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Entity;

namespace backend.AccountComponent.Dataaccess.Api.Repo;

public interface IAccountRepository
{
    Task<int> SaveAsync(Account account);
    Task<AccountRetrieveDto?> GetByNameAsync(string name);
    Task<AccountRetrieveDto?> GetByIdAsync(int id);
    /// <summary>
    /// Returns null if the account has no chosen client token or does not exist.
    /// </summary>
    Task<string?> GetChosenClientTokenAsync(int id);
    /// <summary>
    /// Returns the number of updated rows, 0 if the account does not exist.
    /// </summary>
    Task<int> SetChosenClientTokenAsync(int id, string token);
    Task<int> DeleteAsync(int id);
}