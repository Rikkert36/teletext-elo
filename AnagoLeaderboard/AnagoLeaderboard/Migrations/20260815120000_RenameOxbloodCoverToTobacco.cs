using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    /// <summary>
    /// Data only - the schema does not move, which is why the model snapshot is identical
    /// to the previous migration's.
    ///
    /// "oxblood" was the id of the tobacco brown, and was labelled "bordeaux" in the UI.
    /// Both were wrong about the colour: it is hue 34-38 degrees at ~40% saturation, a
    /// warm brown, about 50 degrees around the wheel from a real oxblood. When an actual
    /// oxblood was added as a stain, the id had to go to the colour that owns the name -
    /// so the brown becomes "tobacco" and every album already bound in it is repointed
    /// here. Without this, freeing the id would have restained every existing book from
    /// brown to dark red on the next page load.
    ///
    /// Raw SQL rather than a rename: the id lives in a column value, not in the schema.
    /// The WHERE clause makes it idempotent, and it touches only rows that predate the
    /// swap - a row written after it means dark red and must not be moved.
    /// </summary>
    public partial class RenameOxbloodCoverToTobacco : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE PlayerCollections SET Cover = 'tobacco' WHERE Cover = 'oxblood';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Exact inverse, and lossless only because "oxblood" cannot yet mean dark red
            // in any row this migration has seen: going down puts the brown back under the
            // id it had. A book bound in the new oxblood AFTER this migration ran would be
            // turned brown by this - which is the ordinary cost of reverting a value
            // migration, and the reason to revert the code with it.
            migrationBuilder.Sql(
                "UPDATE PlayerCollections SET Cover = 'oxblood' WHERE Cover = 'tobacco';");
        }
    }
}
