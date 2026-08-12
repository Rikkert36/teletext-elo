using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    /// <inheritdoc />
    public partial class RenameLegendsToIcons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "LegendsUnlockedAt",
                table: "PlayerCollections",
                newName: "IconsUnlockedAt");

            migrationBuilder.RenameColumn(
                name: "IsLegend",
                table: "CardInstances",
                newName: "IsIcon");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "IconsUnlockedAt",
                table: "PlayerCollections",
                newName: "LegendsUnlockedAt");

            migrationBuilder.RenameColumn(
                name: "IsIcon",
                table: "CardInstances",
                newName: "IsLegend");
        }
    }
}
