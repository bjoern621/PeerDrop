using backend.AccountComponent.Dataaccess.Api.Entity;

namespace backend.AccountComponent.Dataaccess.Api.Repo;

public interface IRefreshTokenRepository
{
    Task SaveAsync(RefreshToken refreshToken);
    Task<RefreshToken?> GetByHashAsync(string tokenHash);
    Task<int> DeleteByHashAsync(string tokenHash);
}
