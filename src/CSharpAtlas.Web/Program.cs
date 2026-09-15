using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
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

var trustedPlatformAssemblies = ((string?)AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES"))?
    .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries)
    .Select(path => MetadataReference.CreateFromFile(path))
    .ToArray() ?? [];

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

app.MapPost("/api/playground/compile", (CompileRequest request) =>
{
    const int maxCodeLength = 30_000;

    if (string.IsNullOrWhiteSpace(request.Code))
    {
        return Results.BadRequest(new { error = "コードが空です。" });
    }

    if (request.Code.Length > maxCodeLength)
    {
        return Results.BadRequest(new { error = $"コードは {maxCodeLength:N0} 文字以内にしてください。" });
    }

    var syntaxTree = CSharpSyntaxTree.ParseText(
        request.Code,
        CSharpParseOptions.Default.WithLanguageVersion(LanguageVersion.Preview));

    var compilation = CSharpCompilation.Create(
        assemblyName: "CSharpAtlas.Playground",
        syntaxTrees: [syntaxTree],
        references: trustedPlatformAssemblies,
        options: new CSharpCompilationOptions(
            OutputKind.ConsoleApplication,
            allowUnsafe: false,
            optimizationLevel: OptimizationLevel.Debug));

    var diagnostics = compilation.GetDiagnostics()
        .Where(d => d.Severity is DiagnosticSeverity.Error or DiagnosticSeverity.Warning)
        .Select(d =>
        {
            var span = d.Location.IsInSource ? d.Location.GetLineSpan() : default;
            return new CompileDiagnostic(
                d.Id,
                d.Severity.ToString().ToLowerInvariant(),
                d.GetMessage(),
                d.Location.IsInSource ? span.StartLinePosition.Line + 1 : null,
                d.Location.IsInSource ? span.StartLinePosition.Character + 1 : null);
        })
        .OrderByDescending(d => d.Severity == "error")
        .ThenBy(d => d.Line ?? int.MaxValue)
        .ThenBy(d => d.Column ?? int.MaxValue)
        .ToArray();

    return Results.Ok(new CompileResponse(
        Success: diagnostics.All(d => d.Severity != "error"),
        Diagnostics: diagnostics));
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

public sealed record CompileRequest(string Code);

public sealed record CompileResponse(bool Success, CompileDiagnostic[] Diagnostics);

public sealed record CompileDiagnostic(
    string Id,
    string Severity,
    string Message,
    int? Line,
    int? Column);
