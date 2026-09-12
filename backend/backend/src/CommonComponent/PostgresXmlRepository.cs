using System.Xml.Linq;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Npgsql;

namespace backend.CommonComponent;

/// <summary>
/// Stores the ASP.NET Core data protection key ring in the data_protection_keys table.
/// The keys share the database's lifecycle: auth cookies stay valid across backend
/// restarts and deployments, and are invalidated together with the account data
/// they protect.
/// </summary>
public class PostgresXmlRepository(NpgsqlDataSource dataSource) : IXmlRepository
{
    public IReadOnlyCollection<XElement> GetAllElements()
    {
        var elements = new List<XElement>();

        using var cmd = dataSource.CreateCommand("SELECT xml FROM data_protection_keys");
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            elements.Add(XElement.Parse(reader.GetString(0)));
        }

        return elements;
    }

    public void StoreElement(XElement element, string friendlyName)
    {
        using var cmd = dataSource.CreateCommand(
            "INSERT INTO data_protection_keys (friendly_name, xml) VALUES (@name, @xml)"
        );
        cmd.Parameters.AddWithValue("name", (object?)friendlyName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("xml", element.ToString(SaveOptions.DisableFormatting));
        cmd.ExecuteNonQuery();
    }
}
