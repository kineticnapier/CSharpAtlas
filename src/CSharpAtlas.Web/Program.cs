using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

var contentPath = Path.Combine(app.Environment.ContentRootPath, "content", "items.json");
var json = await File.ReadAllTextAsync(contentPath);
var items = JsonSerializer.Deserialize<List<AtlasItem>>(json, new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true
}) ?? [];

app.MapGet("/api/items", (string? q, string? type) =>
{
    IEnumerable<AtlasItem> result = items;

    if (!string.IsNullOrWhiteSpace(type) && !string.Equals(type, "all", StringComparison.OrdinalIgnoreCase))
    {
        result = result.Where(x => string.Equals(x.Type, type, StringComparison.OrdinalIgnoreCase));
    }

    if (!string.IsNullOrWhiteSpace(q))
    {
        var words = q.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        result = result.Where(item => words.All(word => Matches(item, word)));
    }

    return Results.Ok(result);
});

app.MapGet("/api/items/{id}", (string id) =>
{
    var item = items.FirstOrDefault(x => string.Equals(x.Id, id, StringComparison.OrdinalIgnoreCase));
    return item is null ? Results.NotFound() : Results.Ok(item);
});

app.MapFallbackToFile("index.html");
app.Run();

static bool Matches(AtlasItem item, string word)
{
    var comparison = StringComparison.OrdinalIgnoreCase;
    return item.Title.Contains(word, comparison)
        || item.Short.Contains(word, comparison)
        || item.Summary.Contains(word, comparison)
        || item.Tags.Any(tag => tag.Contains(word, comparison));
}

public sealed record AtlasItem(
    string Id,
    string Type,
    string Title,
    string Short,
    string Summary,
    string? Bad,
    string? Good,
    string? Code,
    string? Why,
    string? Tips,
    string[] Tags,
    string[] Related);
