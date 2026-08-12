using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    /// <summary>
    /// Every present gets a recipient. "Everybody" is now expanded at gift time instead of stored
    /// as a null, so existing unaddressed rows have to be expanded here to match.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <strong>The scaffolded version of this was dangerous and was replaced by hand.</strong> EF
    /// offered a bare <c>AlterColumn</c> with <c>defaultValue: ""</c>, which would have turned
    /// every unaddressed present into one addressed to a player id of <c>""</c> - matching nobody,
    /// under a foreign key that is now required - and then the delete cascade from
    /// <c>PackClaims.GiftId</c> would have taken the cards anyone had already claimed from those
    /// presents with it.
    /// </para>
    /// <para>
    /// So the data is moved first and the column altered afterwards. Nothing is dropped: an
    /// unaddressed gift becomes one addressed gift per player, and any claim already made against
    /// it is re-pointed at the claimant's own new row before the original goes.
    /// </para>
    /// </remarks>
    public partial class AddressEveryGift : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            /*
             * One addressed row per player, per unaddressed gift.
             *
             * The new id is `{giftId}:{playerId}` rather than a fresh GUID, and deliberately so:
             * it makes the claim re-pointing below a pure string expression instead of a join
             * against rows this statement has just written, and it leaves the origin of each row
             * legible in a database browser afterwards.
             */
            migrationBuilder.Sql(
                """
                INSERT INTO "PackGifts" ("Id", "PlayerId", "Size", "MinimumOverall", "Reason", "CreatedAt", "ExpiresAt")
                SELECT g."Id" || ':' || p."Id", p."Id", g."Size", g."MinimumOverall", g."Reason", g."CreatedAt", g."ExpiresAt"
                FROM "PackGifts" g
                CROSS JOIN "Players" p
                WHERE g."PlayerId" IS NULL;
                """);

            /*
             * Move any claim already made against an unaddressed gift onto that claimant's own new
             * row. Must run before the delete below, or the cascade from PackClaims.GiftId takes
             * the claim - and through it the cards - with the original.
             */
            migrationBuilder.Sql(
                """
                UPDATE "PackClaims"
                SET "GiftId" = "GiftId" || ':' || "PlayerId"
                WHERE "GiftId" IN (SELECT "Id" FROM "PackGifts" WHERE "PlayerId" IS NULL);
                """);

            migrationBuilder.Sql(@"DELETE FROM ""PackGifts"" WHERE ""PlayerId"" IS NULL;");

            // Only now, when there is nothing left for the default to be applied to.
            migrationBuilder.AlterColumn<string>(
                name: "PlayerId",
                table: "PackGifts",
                type: "TEXT",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "TEXT",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            /*
             * The column goes back to nullable, and that is all.
             *
             * The expansion is **not** undone, and could not be honestly: once one present has
             * become forty, there is no way to tell a row that was expanded from one that was
             * always addressed - and collapsing them would have to pick a claim to keep. Going
             * back leaves every recipient holding the present they were given, which is the
             * conservative reading and loses nothing.
             */
            migrationBuilder.AlterColumn<string>(
                name: "PlayerId",
                table: "PackGifts",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "TEXT");
        }
    }
}
