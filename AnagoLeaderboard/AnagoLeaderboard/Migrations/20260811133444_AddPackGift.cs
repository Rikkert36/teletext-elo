using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    /// <inheritdoc />
    public partial class AddPackGift : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GiftId",
                table: "PackClaims",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PackGifts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    PlayerId = table.Column<string>(type: "TEXT", nullable: true),
                    Size = table.Column<int>(type: "INTEGER", nullable: false),
                    MinimumOverall = table.Column<int>(type: "INTEGER", nullable: true),
                    Reason = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PackGifts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PackGifts_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PackClaims_GiftId",
                table: "PackClaims",
                column: "GiftId");

            migrationBuilder.CreateIndex(
                name: "IX_PackClaims_PlayerId_GiftId",
                table: "PackClaims",
                columns: new[] { "PlayerId", "GiftId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PackGifts_PlayerId",
                table: "PackGifts",
                column: "PlayerId");

            migrationBuilder.AddForeignKey(
                name: "FK_PackClaims_PackGifts_GiftId",
                table: "PackClaims",
                column: "GiftId",
                principalTable: "PackGifts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PackClaims_PackGifts_GiftId",
                table: "PackClaims");

            migrationBuilder.DropTable(
                name: "PackGifts");

            migrationBuilder.DropIndex(
                name: "IX_PackClaims_GiftId",
                table: "PackClaims");

            migrationBuilder.DropIndex(
                name: "IX_PackClaims_PlayerId_GiftId",
                table: "PackClaims");

            migrationBuilder.DropColumn(
                name: "GiftId",
                table: "PackClaims");
        }
    }
}
