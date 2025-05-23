using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using ArchUnitNET.NUnit;
using Microsoft.VisualStudio.TestPlatform.TestHost;
using backend.AccountCompoment.Logic.Impl;

using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace tests;

public class ArchTest
{
    public static readonly ArchUnitNET.Domain.Architecture Architecture = new ArchLoader().LoadAssembly(
       typeof(AccountHandler).Assembly).Build();


    [Test]
    public void ImplClassesShouldImplementAnInterface()
    {
        var rule = Types().That().ResideInNamespace("Impl", true).Should().ImplementInterface("Api", true);

        rule.Check(Architecture);
    }

    [Test]
    public void DataaccessClassesShouldNotDependOnAnything()
    {
        var rule = Types().That().ResideInNamespace("Dataaccess", true)
             .Should().NotDependOnAny(
                 Types().That().ResideInNamespace("Facade", true)
             )
             .AndShould().NotDependOnAny(
                 Types().That().ResideInNamespace("Logic", true)
             );

        rule.Check(Architecture);
    }

    [Test]
    public void LogicClassesShouldOnlyDependOnDataaccess()
    {
        var rule = Types().That().ResideInNamespace("Logic", true)
             .Should().NotDependOnAny(
                 Types().That().ResideInNamespace("Facade", true)
             );

        rule.Check(Architecture);
    }

    [Test]
    public void FacadeClassesShouldOnlyDependOnLogic()
    {
        var rule = Types().That().ResideInNamespace("Facade", true)
             .Should().NotDependOnAny(
                 Types().That().ResideInNamespace("Dataaccess", true)
             );

        rule.Check(Architecture);
    }
}