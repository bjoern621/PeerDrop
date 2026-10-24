using backend.ConnectionComponent.Dataaccess.Impl;

namespace backend.tests.ConnectionComponent.Dataaccess.Impl;

[Category("UnitTest")]
public class PairRepositoryTest
{
    private const string TOKEN_A = "sabak";
    private const string TOKEN_B = "rinot";
    private const string TOKEN_C = "lukid";

    private PairRepository _repository;

    [SetUp]
    public void Setup()
    {
        _repository = new PairRepository();
    }

    [Test]
    public void TryAddConnectedPair_PairInEitherOrderConnected_ReturnsFalse()
    {
        Assert.Multiple(() =>
        {
            Assert.That(_repository.TryAddConnectedPair(TOKEN_A, TOKEN_B), Is.True);
            Assert.That(_repository.TryAddConnectedPair(TOKEN_B, TOKEN_A), Is.False);
        });
    }

    [Test]
    public void AreConnected_IgnoresOrderAndCase()
    {
        _repository.TryAddConnectedPair(TOKEN_A, TOKEN_B);

        Assert.Multiple(() =>
        {
            Assert.That(_repository.AreConnected(TOKEN_B.ToUpperInvariant(), TOKEN_A), Is.True);
            Assert.That(_repository.AreConnected(TOKEN_A, TOKEN_C), Is.False);
        });
    }

    [Test]
    public void HasPermissionEitherWay_PermissionInOneDirection_ReturnsTrueForBoth()
    {
        _repository.AddPermission(TOKEN_A, TOKEN_B);

        Assert.Multiple(() =>
        {
            Assert.That(_repository.HasPermissionEitherWay(TOKEN_A, TOKEN_B), Is.True);
            Assert.That(_repository.HasPermissionEitherWay(TOKEN_B, TOKEN_A), Is.True);
            Assert.That(_repository.HasPermissionEitherWay(TOKEN_A, TOKEN_C), Is.False);
        });
    }

    [Test]
    public void TryRemoveConnectedPair_KeepsPermission()
    {
        _repository.AddPermission(TOKEN_A, TOKEN_B);
        _repository.TryAddConnectedPair(TOKEN_A, TOKEN_B);

        Assert.Multiple(() =>
        {
            Assert.That(_repository.TryRemoveConnectedPair(TOKEN_B, TOKEN_A), Is.True);
            Assert.That(_repository.TryRemoveConnectedPair(TOKEN_B, TOKEN_A), Is.False);
            Assert.That(_repository.AreConnected(TOKEN_A, TOKEN_B), Is.False);
            Assert.That(_repository.HasPermissionEitherWay(TOKEN_A, TOKEN_B), Is.True);
        });
    }

    [Test]
    public void RemoveClient_ReturnsPartnersAndDropsItsPairsOnly()
    {
        _repository.TryAddConnectedPair(TOKEN_A, TOKEN_B);
        _repository.TryAddConnectedPair(TOKEN_C, TOKEN_A);
        _repository.TryAddConnectedPair(TOKEN_B, TOKEN_C);
        _repository.AddPermission(TOKEN_B, TOKEN_A);
        _repository.AddPermission(TOKEN_B, TOKEN_C);

        var partners = _repository.RemoveClient(TOKEN_A);

        Assert.Multiple(() =>
        {
            Assert.That(partners, Is.EquivalentTo(new[] { TOKEN_B, TOKEN_C }));
            Assert.That(_repository.AreConnected(TOKEN_A, TOKEN_B), Is.False);
            Assert.That(_repository.HasPermissionEitherWay(TOKEN_A, TOKEN_B), Is.False);
            Assert.That(_repository.AreConnected(TOKEN_B, TOKEN_C), Is.True);
            Assert.That(_repository.HasPermissionEitherWay(TOKEN_B, TOKEN_C), Is.True);
        });
    }
}
