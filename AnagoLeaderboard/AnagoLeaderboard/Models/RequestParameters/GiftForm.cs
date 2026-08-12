namespace AnagoLeaderboard.Models.RequestParameters
{
    /// <summary>
    /// A present: who it is for, and what is in it.
    ///
    /// Two axes and no more. **Who** is a list of players or - by leaving the list out - everybody.
    /// **What** is either a count of ordinary cards or a floor on the overall, never both: those
    /// are the two products, and a guaranteed packet is always a single card.
    /// </summary>
    public class GiftForm
    {
        /// <summary>
        /// The recipients. Null or empty means the whole office.
        ///
        /// Naming the same player twice hands them one packet, not two.
        /// </summary>
        public List<string>? PlayerIds { get; set; }

        /// <summary>
        /// How many cards, drawn on the ordinary odds. Exactly one of this and
        /// <see cref="MinimumOverall"/>.
        /// </summary>
        public int? Size { get; set; }

        /// <summary>
        /// A floor on the overall of the one card in it - so 75 is "goud or better", and the
        /// ceremony's four steps are 75, 80, 85 and 90.
        ///
        /// A raw overall rather than a tier or a level because it is the number both of those are
        /// expressed in, and it can say things neither can: a tier cannot separate 75-79 from
        /// 80-84 (both goud) and a level cannot ask for zilver at all.
        ///
        /// Setting it makes the packet a single card, so <see cref="Size"/> must be left out.
        /// </summary>
        public int? MinimumOverall { get; set; }

        /// <summary>
        /// Why, in Dutch - it reaches the wrapper's tooltip the way a game pack's reason does.
        /// Optional; presents get a default rather than an empty label.
        /// </summary>
        public string? Reason { get; set; }
    }
}
