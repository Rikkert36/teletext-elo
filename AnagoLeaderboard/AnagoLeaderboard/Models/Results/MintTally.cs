namespace AnagoLeaderboard.Models.Results;

/// <summary>
/// How many copies of one subject a collector holds, split by which kind of card they came out
/// of the packet as.
///
/// The split is the whole point, and it is a change of rule rather than of shape: a slot is
/// filled by a card of <em>its own kind</em>, so the icoon slot of somebody you collected as an
/// active player starts empty and has to be packed again. Before this there was one flat count
/// per subject, and a card followed its subject from the active pool into the icons - which
/// meant part of the icons set arrived already filled on the day it was unlocked, as a reward
/// for cards earned towards a different set.
///
/// <strong>This is not a retreat from live cards.</strong> What a card <em>looks like</em> is
/// still read off the live pool, icoon colourway included, and
/// <see cref="CardInstance.IsIcon"/> is still never consulted to draw one. The two rules answer
/// different questions and both hold at once: appearance follows the subject's current standing,
/// and what fills a slot is the kind of card you actually packed. A held player card of somebody
/// who has since retired is *displayed* nowhere - their active slot is gone with them - and
/// counted here, which is what lets the checklist print the count in brackets against an
/// unticked icoon row instead of the card silently vanishing.
///
/// Symmetric, and it has to be: an icoon who starts playing again returns to the actives, and
/// their active slot then wants a player card. Note what symmetry does *not* mean - the counts
/// are not sliced by era. <see cref="AsPlayer"/> is every player card of that subject there has
/// ever been, whether packed before the retirement or after the comeback, because the alternative
/// is a card that stops counting on account of the day it was drawn.
/// </summary>
/// <param name="AsPlayer">Copies drawn while the subject was an active player.</param>
/// <param name="AsIcon">Copies drawn while the subject was an icoon.</param>
public sealed record MintTally(int AsPlayer, int AsIcon)
{
    /// <summary>Nothing held. Handed out by the lookups so callers need no null branch.</summary>
    public static readonly MintTally None = new(0, 0);

    /// <summary>
    /// The count that fills a slot of this kind, and the only way this pair should ever be read
    /// against a card. Takes the flag off the live <see cref="CardSubject"/> rather than off a
    /// stored row - what kind of slot a subject has today is a question about the pool.
    /// </summary>
    public int OfKind(bool isIcon) => isIcon ? AsIcon : AsPlayer;

    /// <summary>The other kind's count: the figure the checklist prints in brackets.</summary>
    public int OfOtherKind(bool isIcon) => isIcon ? AsPlayer : AsIcon;

    /// <summary>This tally with one more card of the given kind minted.</summary>
    public MintTally Plus(bool isIcon) =>
        isIcon ? this with { AsIcon = AsIcon + 1 } : this with { AsPlayer = AsPlayer + 1 };
}
