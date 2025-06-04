using ArchUnitNET.Domain;
using ArchUnitNET.Fluent.Conditions;

namespace backend.tests.Common
{
    public class DependOnOtherComponentOnlyThroughApiCustomCondition : ICondition<IType>
    {
        public string Description => "depend on types from other components only if those types are in an 'Api' namespace of that other component";

        /// <summary>
        /// Extracts the component name from a fully qualified namespace. Example: "backend.SignalingComponent.Facade.Impl" -> "SignalingComponent"
        /// </summary>
        private static string? GetComponentNameFromNamespace(string fullNamespace)
        {
            if (string.IsNullOrEmpty(fullNamespace) || !fullNamespace.StartsWith("backend."))
            {
                return null;
            }
            var parts = fullNamespace.Split('.');
            if (parts.Length >= 2 && parts[1].Contains("Component"))
            {
                return parts[1];
            }
            return null;
        }

        public IEnumerable<ConditionResult> Check(IEnumerable<IType> typesToEvaluate, Architecture architecture)
        {
            var results = new List<ConditionResult>();

            foreach (var sourceType in typesToEvaluate)
            {
                if (sourceType is null)
                {
                    continue; // Skip if the type something unexpected
                }

                string? sourceComponentName = GetComponentNameFromNamespace(sourceType.Namespace.FullName);

                if (sourceComponentName == null)
                {
                    results.Add(new ConditionResult(sourceType, true, $"Type {sourceType.FullName} is not in a recognized 'backend.XyzComponent' structure for this rule."));
                    continue;
                }

                bool overallPassForSourceType = true;
                var failureDetails = new List<string>();
                var failedTestCount = 0;

                foreach (var dependency in sourceType.Dependencies)
                {
                    // if (dependency.Target is not IType targetType || targetType.IsGenericParameter || targetType.IsCompilerGenerated || targetType.Namespace == null || string.IsNullOrEmpty(targetType.Namespace.FullName))
                    // {
                    //     continue;
                    // }

                    // if (targetType.Assembly.FullName != sourceType.Assembly.FullName)
                    // {
                    //     continue;
                    // }

                    var targetType = dependency.Target;

                    string? targetComponentName = GetComponentNameFromNamespace(targetType.Namespace.FullName);

                    if (targetComponentName == null)
                    {
                        continue;
                    }

                    if (sourceComponentName != targetComponentName)
                    {
                        string targetFullNamespace = targetType.Namespace.FullName;
                        bool isApiDependency = targetFullNamespace.Contains("Api");

                        if (!isApiDependency)
                        {
                            overallPassForSourceType = false;
                            failureDetails.Add($"{failedTestCount + 1} - depends on {targetType.FullName} (in component {targetComponentName}) which is not in an 'Api' namespace of that component");

                            failedTestCount++;
                        }
                    }
                }

                if (overallPassForSourceType)
                {
                    results.Add(new ConditionResult(sourceType, true, $"Type {sourceType.FullName} adheres to inter-component API dependency rules.\n"));
                }
                else
                {
                    results.Add(new ConditionResult(sourceType, false, $"Type {sourceType.FullName} (in component {sourceComponentName}) violates inter-component API dependency rules: \n{string.Join("; \n", failureDetails)}."));
                }
            }

            return results;
        }

        public bool CheckEmpty()
        {
            return true;
        }
    }
}