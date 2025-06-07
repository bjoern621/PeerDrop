namespace backend.AccountCompoment.Logic.Api;

public interface IPasswordHasher
{
    public string HashPassword(string password);

    public bool VerifyPassword(string password, string hashedPassword);
}