using backend.AccountComponent.Logic.Impl;

namespace backend.tests.AccountComponent.Logic.Impl;

[Category("UnitTest")]
public class PasswordHasherTests
{
    private PasswordHasher _hasher;

    [SetUp]
    public void Setup()
    {
        _hasher = new PasswordHasher();
    }

    [Test]
    public void HashPassword_ShouldReturnNonNullBase64String()
    {
        var password = "SecurePassword123!";
        
        var hashed = _hasher.HashPassword(password);
        
        Assert.That(hashed, Is.Not.Null.And.Not.Empty);
        Assert.DoesNotThrow(() => _ = Convert.FromBase64String(hashed));
    }

    [Test]
    public void VerifyPassword_ShouldReturnTrue_ForCorrectPassword()
    {
        var password = "MyS3cret!";
        var hashed = _hasher.HashPassword(password);
        
        var result = _hasher.VerifyPassword(password, hashed);
        
        Assert.That(result, Is.True);
    }

    [Test]
    public void VerifyPassword_ShouldReturnFalse_ForIncorrectPassword()
    {
        var originalPassword = "CorrectHorseBatteryStaple";
        var wrongPassword = "Tr0ub4dor&3";
        var hashed = _hasher.HashPassword(originalPassword);
        
        var result = _hasher.VerifyPassword(wrongPassword, hashed);
        
        Assert.That(result, Is.False);
    }

    [Test]
    public void HashPassword_ShouldGenerateDifferentHashes_ForSamePassword()
    {
        var password = "RepeatablePassword";
        
        var hash1 = _hasher.HashPassword(password);
        var hash2 = _hasher.HashPassword(password);
        
        Assert.That(hash1, Is.Not.EqualTo(hash2));
    }
}

