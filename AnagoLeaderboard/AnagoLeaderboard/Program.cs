using AnagoLeaderboard.Database;
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
builder.Services.AddDbContext<DatabaseContext>(
    options =>
        options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"))
);


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");
//app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();