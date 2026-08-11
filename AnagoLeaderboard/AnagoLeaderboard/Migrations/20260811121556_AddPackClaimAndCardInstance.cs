using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    /// <inheritdoc />
    public partial class AddPackClaimAndCardInstance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PackClaims",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    PlayerId = table.Column<string>(type: "TEXT", nullable: false),
                    Source = table.Column<string>(type: "TEXT", nullable: false),
                    GameId = table.Column<string>(type: "TEXT", nullable: true),
                    ClaimDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ClaimedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PackClaims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PackClaims_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PackClaims_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CardInstances",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    PlayerId = table.Column<string>(type: "TEXT", nullable: false),
                    SubjectPlayerId = table.Column<string>(type: "TEXT", nullable: false),
                    PackClaimId = table.Column<string>(type: "TEXT", nullable: false),
                    GameId = table.Column<string>(type: "TEXT", nullable: true),
                    IsLegend = table.Column<bool>(type: "INTEGER", nullable: false),
                    MintedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardInstances", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CardInstances_Games_GameId",
                        column: x => x.GameId,
                        principalTable: "Games",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardInstances_PackClaims_PackClaimId",
                        column: x => x.PackClaimId,
                        principalTable: "PackClaims",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardInstances_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardInstances_Players_SubjectPlayerId",
                        column: x => x.SubjectPlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CardInstances_GameId",
                table: "CardInstances",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_CardInstances_PackClaimId",
                table: "CardInstances",
                column: "PackClaimId");

            migrationBuilder.CreateIndex(
                name: "IX_CardInstances_PlayerId_SubjectPlayerId",
                table: "CardInstances",
                columns: new[] { "PlayerId", "SubjectPlayerId" });

            migrationBuilder.CreateIndex(
                name: "IX_CardInstances_SubjectPlayerId",
                table: "CardInstances",
                column: "SubjectPlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_PackClaims_GameId",
                table: "PackClaims",
                column: "GameId");

            migrationBuilder.CreateIndex(
                name: "IX_PackClaims_PlayerId_ClaimDate",
                table: "PackClaims",
                columns: new[] { "PlayerId", "ClaimDate" },
                unique: true,
                filter: "\"Source\" = 'Daily'");

            migrationBuilder.CreateIndex(
                name: "IX_PackClaims_PlayerId_Source_GameId",
                table: "PackClaims",
                columns: new[] { "PlayerId", "Source", "GameId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CardInstances");

            migrationBuilder.DropTable(
                name: "PackClaims");
        }
    }
}
