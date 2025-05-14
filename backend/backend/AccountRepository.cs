using Npgsql;

namespace backend;

public class AccountRepository : IAccountRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public AccountRepository()
    {
        // Read environment variables each time
        var host     = Environment.GetEnvironmentVariable("DB_HOST")
                       ?? throw new ApplicationException("DB_HOST not set");
        var user     = Environment.GetEnvironmentVariable("DB_USERNAME")
                       ?? throw new ApplicationException("DB_USERNAME not set");
        var pass     = Environment.GetEnvironmentVariable("DB_PASSWORD")
                       ?? throw new ApplicationException("DB_PASSWORD not set");
        var database = Environment.GetEnvironmentVariable("DB_DATABASE_NAME")
                       ?? throw new ApplicationException("DB_DATABASE_NAME not set");

        var connString = $"Host={host};Username={user};Password={pass};Database={database}";
        _dataSource = NpgsqlDataSource.Create(connString);
    }
    
    public Task<int> DeleteAsync(int id)
    {
        throw new NotImplementedException();
    }
    
    public async Task<int> SaveAsync(Account account)
    {
        string displayName = account.getName();
        string password = account.getPassword();
        
        await using var cmd = _dataSource.CreateCommand(
            "INSERT INTO users (display_name,passwort) VALUES (@name,@password) RETURNING id");
        // supply each parameter separately:
        cmd.Parameters.AddWithValue("name",    displayName);
        cmd.Parameters.AddWithValue("password", password);
        
        // will never return null although warning indicates otherwise
        return (int)await cmd.ExecuteScalarAsync();
    }
    
    public async Task<Account?> GetByNameAsync(string name)
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT id, display_name, passwort FROM users WHERE display_name = @name");
        cmd.Parameters.AddWithValue("name", name);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new Account(
            reader.GetString(1),
            reader.GetString(2)
        );
    }
}