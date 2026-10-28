using AnagoLeaderboard.Database;
using AnagoLeaderboard.Models.Results;
using Microsoft.EntityFrameworkCore;

namespace AnagoLeaderboard.Services;

/// <summary>
/// The collectors' standings: each album's book value, its gaps, and the pack matrix behind it.
/// </summary>
public class CollectorStandingsService
{
    private readonly DatabaseContext _dbContext;
    private readonly LeaderBoardService _leaderBoardService;
    private readonly CardPoolService _cardPoolService;
    private readonly CardRatingCalculator _cardRatingCalculator;

    public CollectorStandingsService(
        DatabaseContext dbContext,
        LeaderBoardService leaderBoardService,
        CardPoolService cardPoolService,
        CardRatingCalculator cardRatingCalculator)
    {
        _dbContext = dbContext;
        _leaderBoardService = leaderBoardService;
        _cardPoolService = cardPoolService;
        _cardRatingCalculator = cardRatingCalculator;
    }

    public async Task<CollectorStandings> GetStandings()
    {
        var pool = await _cardPoolService.GetPool();

        var collectors = await _dbContext.PlayerCollections
            .Join(
                _dbContext.Players.Where(player => player.Active),
                collection => collection.PlayerId,
                player => player.Id,
                (collection, player) => new
                {
                    player.Id,
                    player.Name,
                    IconsUnlocked = collection.IconsUnlockedAt != null
                })
            .ToListAsync();

        var tallies = await _dbContext.CardInstances
            .GroupBy(card => new { card.PlayerId, card.SubjectPlayerId })
            .Select(group => new
            {
                group.Key.PlayerId,
                group.Key.SubjectPlayerId,
                AsPlayer = group.Count(card => !card.IsIcon),
                AsIcon = group.Count(card => card.IsIcon)
            })
            .ToListAsync();

        var countsByCollector = tallies
            .GroupBy(tally => tally.PlayerId)
            .ToDictionary(
                group => group.Key,
                group => group.ToDictionary(
                    tally => tally.SubjectPlayerId,
                    tally => new MintTally(tally.AsPlayer, tally.AsIcon)));

        // A slot weighs 1/p in the pool it is drawn from: volume I before the unlock, the whole pool after.
        var activeMass = pool.Actives.Sum(subject => _cardRatingCalculator.TicketsFor(subject.Overall));
        var unlockedMass = activeMass + pool.Icons.Sum(subject => _cardRatingCalculator.TicketsFor(subject.Overall));
        var activeWeights = pool.Actives.Select(subject => activeMass / _cardRatingCalculator.TicketsFor(subject.Overall)).ToList();
        var iconWeights = pool.Icons.Select(subject => unlockedMass / _cardRatingCalculator.TicketsFor(subject.Overall)).ToList();
        var activeTotal = activeWeights.Sum();
        var iconTotal = iconWeights.Sum();

        var scored = collectors
            .Select(collector =>
            {
                var counts = countsByCollector.GetValueOrDefault(collector.Id)
                             ?? new Dictionary<string, MintTally>();
                var activeCounts = pool.Actives
                    .Select(subject => counts.GetValueOrDefault(subject.Id, MintTally.None).AsPlayer)
                    .ToList();
                var iconCounts = pool.Icons
                    .Select(subject => counts.GetValueOrDefault(subject.Id, MintTally.None).AsIcon)
                    .ToList();

                var activeValue = activeWeights.Where((_, index) => activeCounts[index] > 0).Sum();
                var iconValue = collector.IconsUnlocked
                    ? iconWeights.Where((_, index) => iconCounts[index] > 0).Sum()
                    : 0;

                var missing = pool.Actives
                    .Where((_, index) => activeCounts[index] == 0)
                    .Concat(collector.IconsUnlocked
                        ? pool.Icons.Where((_, index) => iconCounts[index] == 0)
                        : Array.Empty<CardSubject>())
                    .Select(subject => subject.Id)
                    .ToList();

                return new
                {
                    collector.Id,
                    collector.Name,
                    collector.IconsUnlocked,
                    Value = activeValue + iconValue,
                    VolumeOnePercent = Percent(activeValue, activeTotal),
                    WithIconsPercent = collector.IconsUnlocked
                        ? Percent(activeValue + iconValue, activeTotal + iconTotal)
                        : (int?)null,
                    Missing = missing,
                    ActiveCounts = activeCounts,
                    IconCounts = collector.IconsUnlocked ? iconCounts : null
                };
            })
            .OrderByDescending(collector => collector.IconsUnlocked)
            .ThenByDescending(collector => collector.Value)
            .ThenBy(collector => collector.Name, StringComparer.CurrentCulture)
            .ToList();

        var standings = new List<CollectorStanding>();
        for (var index = 0; index < scored.Count; index++)
        {
            var collector = scored[index];
            var previous = index > 0 ? scored[index - 1] : null;
            var rank = previous is not null
                       && previous.IconsUnlocked == collector.IconsUnlocked
                       && previous.Value == collector.Value
                ? standings[index - 1].Rank
                : index + 1;

            standings.Add(new CollectorStanding(
                collector.Id,
                collector.Name,
                rank,
                collector.IconsUnlocked,
                collector.VolumeOnePercent,
                collector.WithIconsPercent,
                collector.Missing,
                collector.ActiveCounts,
                collector.IconCounts));
        }

        return new CollectorStandings(pool.Actives, pool.Icons, standings);
    }

    // Rounded down, so only a complete book reads 100%.
    private static int Percent(double value, double total) =>
        total > 0 ? (int)Math.Floor(value / total * 100) : 0;
}
