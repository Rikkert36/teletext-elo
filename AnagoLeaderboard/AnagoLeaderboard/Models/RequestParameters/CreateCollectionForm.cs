namespace AnagoLeaderboard.Models.RequestParameters
{
    /// <summary>
    /// Which leather the player picked off the table. Validated against
    /// <see cref="Results.AlbumCovers.All"/> rather than typed as an enum, so the JSON stays
    /// a readable string and an unknown value is a 400 instead of a silent zero.
    /// </summary>
    public class CreateCollectionForm
    {
        public string Cover { get; set; }
    }
}
