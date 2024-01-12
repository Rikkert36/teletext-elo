using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnagoLeaderboard.Migrations
{
    /// <inheritdoc />
    public partial class AddOwned : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FirstTeam_FirstPlayer_Name",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "FirstTeam_FirstPlayer_NewRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FirstTeam_FirstPlayer_OldRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "FirstTeam_FirstPlayer_PlayerId",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "FirstTeam_Goals",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "FirstTeam_SecondPlayer_Name",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "FirstTeam_SecondPlayer_NewRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "FirstTeam_SecondPlayer_OldRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "FirstTeam_SecondPlayer_PlayerId",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SecondTeam_FirstPlayer_Name",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SecondTeam_FirstPlayer_NewRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SecondTeam_FirstPlayer_OldRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SecondTeam_FirstPlayer_PlayerId",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SecondTeam_Goals",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SecondTeam_SecondPlayer_Name",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "SecondTeam_SecondPlayer_NewRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SecondTeam_SecondPlayer_OldRating",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SecondTeam_SecondPlayer_PlayerId",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstTeam_FirstPlayer_Name",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_FirstPlayer_NewRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_FirstPlayer_OldRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_FirstPlayer_PlayerId",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_Goals",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_SecondPlayer_Name",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_SecondPlayer_NewRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_SecondPlayer_OldRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "FirstTeam_SecondPlayer_PlayerId",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_FirstPlayer_Name",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_FirstPlayer_NewRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_FirstPlayer_OldRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_FirstPlayer_PlayerId",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_Goals",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_SecondPlayer_Name",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_SecondPlayer_NewRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_SecondPlayer_OldRating",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "SecondTeam_SecondPlayer_PlayerId",
                table: "Games");
        }
    }
}
