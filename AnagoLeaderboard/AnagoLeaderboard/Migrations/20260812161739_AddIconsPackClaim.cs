using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    /// <inheritdoc />
    public partial class AddIconsPackClaim : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_PackClaims_PlayerId",
                table: "PackClaims",
                column: "PlayerId",
                unique: true,
                filter: "\"Source\" = 'Icons'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PackClaims_PlayerId",
                table: "PackClaims");
        }
    }
}
