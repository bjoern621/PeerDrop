using ArchUnitNET.Loader;
using ArchUnitNET.NUnit;
using static ArchUnitNET.Fluent.ArchRuleDefinition;

namespace backend.tests.Common;

[Category("Architecture")]
public class ArchTest
{
    public static readonly ArchUnitNET.Domain.Architecture Architecture = new ArchLoader().LoadAssembly(
       System.Reflection.Assembly.Load("backend")).Build();


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

    [Test]
    public void ComponentsCannotUseImplClasses()
    {
        var rule = Types().That().ResideInNamespace("Component", true)
            .And().DoNotResideInNamespace("Impl", true)
            .Should().NotDependOnAny(
                Types().That().ResideInNamespace("Impl", true)
            );

        rule.Check(Architecture);
    }

    [Test]
    public void ComponentsCanDependOnOtherComponentOnlyThroughApiNamespace()
    {
        var typesInComponents = Types().That().ResideInNamespace("Component", true);

        var rule = typesInComponents.Should().FollowCustomCondition(new DependOnOtherComponentOnlyThroughApiCustomCondition());

        rule.Check(Architecture);

    }
}