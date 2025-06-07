using Npgsql;

namespace backend.tests.TestUtils;

public static class DatabaseUtil
{
    public static async Task ResetDatabaseAsync()
    {
        var host     = Environment.GetEnvironmentVariable("DB_HOST")!;
        var user     = Environment.GetEnvironmentVariable("DB_USERNAME")!;
        var pass     = Environment.GetEnvironmentVariable("DB_PASSWORD")!;
        var database = Environment.GetEnvironmentVariable("DB_DATABASE_NAME")!;
    
        var connString = $"Host={host};Username={user};Password={pass};Database={database}";
    
        await using var dataSource = NpgsqlDataSource.Create(connString);
        await using var cmd = dataSource.CreateCommand("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
        await cmd.ExecuteNonQueryAsync();
    }
}