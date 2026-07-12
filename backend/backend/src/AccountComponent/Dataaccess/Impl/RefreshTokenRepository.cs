using backend.AccountComponent.Dataaccess.Api.Entity;
using backend.AccountComponent.Dataaccess.Api.Repo;
using Npgsql;

namespace backend.AccountComponent.Dataaccess.Impl;

public class RefreshTokenRepository(NpgsqlDataSource _dataSource) : IRefreshTokenRepository
{
    public async Task SaveAsync(RefreshToken refreshToken)
    {
        await using var cmd = _dataSource.CreateCommand(
            "INSERT INTO refresh_tokens (token_hash, account_id, expires_at) VALUES (@tokenHash, @accountId, @expiresAt)");
        cmd.Parameters.AddWithValue("tokenHash", refreshToken.GetTokenHash());
        cmd.Parameters.AddWithValue("accountId", refreshToken.GetAccountId());
        cmd.Parameters.AddWithValue("expiresAt", refreshToken.GetExpiresAt());

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<RefreshToken?> GetByHashAsync(string tokenHash)
    {
        await using var cmd = _dataSource.CreateCommand(
            "SELECT token_hash, account_id, expires_at FROM refresh_tokens WHERE token_hash = @tokenHash");
        cmd.Parameters.AddWithValue("tokenHash", tokenHash);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;

        return new RefreshToken(
            reader.GetString(0),
            reader.GetInt32(1),
            reader.GetDateTime(2)
        );
    }

    public async Task<int> DeleteByHashAsync(string tokenHash)
    {
        await using var cmd = _dataSource.CreateCommand(
            "DELETE FROM refresh_tokens WHERE token_hash = @tokenHash");
        cmd.Parameters.AddWithValue("tokenHash", tokenHash);

        return await cmd.ExecuteNonQueryAsync();
    }
}
