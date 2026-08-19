using AnagoLeaderboard.Database;
using AnagoLeaderboard.Security;
using AnagoLeaderboard.Services;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddCors(
    options =>
    {
        options.AddPolicy(
            "AllowReactApp",
            builder => builder.WithOrigins(
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "https://localhost:3000",
                    "http://rik-dev/tafelvoetbal",
                    "http://rik-dev/tafelvoetbal:8000")
                .WithMethods("GET", "HEAD", "POST", "DEBUG", "PUT", "DELETE", "PATCH", "OPTIONS")
                .AllowAnyHeader()
                .WithExposedHeaders("Content-Disposition"));
    }
);

builder.Services.AddScoped<LeaderBoardService>();
builder.Services.AddScoped<GameService>();
builder.Services.AddScoped<PlayerService>();
builder.Services.AddScoped<ChampionService>();
builder.Services.AddScoped<CardPoolService>();
builder.Services.AddScoped<CollectionService>();
builder.Services.AddScoped<PackService>();
builder.Services.AddScoped<CardStatisticsService>();
builder.Services.AddScoped<PackHistoryService>();

// No state, just paths and a process invocation, so singletons.
builder.Services.AddSingleton<AvatarStorage>();
// Pure functions over a fixed balance table read once from configuration.
builder.Services.AddSingleton<CardRatingCalculator>();
builder.Services.AddSingleton<SilhouetteService>();

builder.Services.AddControllers();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(
    c =>
    {
        c.CustomOperationIds(
            d => d.ActionDescriptor is ControllerActionDescriptor controllerActionDescriptor
                ? controllerActionDescriptor.MethodInfo.Name
                : d.ActionDescriptor.AttributeRouteInfo?.Name);
    });
builder.Services.AddDbContext<DatabaseContext>(options =>
{
    var dataBasePath = builder.Configuration.GetSection("FileSystem")["BasePath"];
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseSqlite($"Data Source={Path.Combine(dataBasePath, connectionString)}");
    
}
);


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// A deploy that forgets the key fails closed and therefore fails quietly - the gift route
// simply answers 404 - so say it once at startup rather than leaving it to be discovered by a
// present that never arrives.
if (!app.Environment.IsDevelopment()
    && string.IsNullOrWhiteSpace(app.Configuration[AdminOnlyAttribute.ConfigurationKey]))
{
    app.Logger.LogWarning(
        "{Setting} is not configured, so admin-only routes answer 404 in this environment. "
        + "Set it as the Admin__Key environment variable.",
        AdminOnlyAttribute.ConfigurationKey);
}

app.UseCors("AllowReactApp");
//app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();