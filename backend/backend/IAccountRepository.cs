namespace backend;

public interface IAccountRepository
{
    Task<int> SaveAsync(Account account);
    Task<Account?> GetByNameAsync(string name);
    Task<int> DeleteAsync(int id);
}