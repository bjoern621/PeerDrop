using backend.AccountComponent.Common.Api.DTOs;
using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using Npgsql;

namespace backend.AccountComponent.Dataaccess.Impl;

public class AccountRepository(NpgsqlDataSource _dataSource) : IAccountRepository
{
    public Task<int> DeleteAsync(int id)
    {
        throw new NotImplementedException();
    }

    public async Task<int> SaveAsync(Account account)
    {
        string displayName = account.GetName();
        string password = account.GetPassword();

        await using var cmd = _dataSource.CreateCommand(
            "INSERT INTO users (display_name,passwort) VALUES (@name,@password) RETURNING id");
        // supply each parameter separately:
        cmd.Parameters.AddWithValue("name", displayName);
        cmd.Parameters.AddWithValue("password", password);

        var result = await cmd.ExecuteScalarAsync();
        if (result is int id)
            return id;

        throw new InvalidOperationException("Insert did not return an ID.");
    }

    public async Task<AccountRetrieveDto?> GetByNameAsync(string name)
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT id, display_name, passwort FROM users WHERE display_name = @name");
        cmd.Parameters.AddWithValue("name", name);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        // DTO since we dont want to encrypt the password 
        var account = new AccountRetrieveDto
        {
            Id = reader.GetInt32(0),
            DisplayName = reader.GetString(1),
            Password = reader.GetString(2)
        };
        return account;
    }

    public async Task<AccountRetrieveDto?> GetByIdAsync(int id)
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT id, display_name, passwort FROM users WHERE id = @id");
        cmd.Parameters.AddWithValue("id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        // DTO since we dont want to encrypt the password 
        var account = new AccountRetrieveDto
        {
            Id = reader.GetInt32(0),
            DisplayName = reader.GetString(1),
            Password = reader.GetString(2)
        };

        return account;
    }
}