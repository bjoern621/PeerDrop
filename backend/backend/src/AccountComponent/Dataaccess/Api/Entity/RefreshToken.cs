namespace backend.AccountComponent.Dataaccess.Api.Entity;

public class RefreshToken
{
    private readonly string _tokenHash;
    private readonly int _accountId;
    private readonly DateTime _expiresAt;

    public RefreshToken(string tokenHash, int accountId, DateTime expiresAt)
    {
        if (string.IsNullOrEmpty(tokenHash))
        {
            throw new ArgumentException("Please provide a token hash");
        }

        _tokenHash = tokenHash;
        _accountId = accountId;
        _expiresAt = expiresAt;
    }

    public string GetTokenHash()
    {
        return _tokenHash;
    }

    public int GetAccountId()
    {
        return _accountId;
    }

    public DateTime GetExpiresAt()
    {
        return _expiresAt;
    }
}
