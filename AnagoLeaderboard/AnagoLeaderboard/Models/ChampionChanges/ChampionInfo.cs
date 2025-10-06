namespace AnagoLeaderboard.Models;

public class ChampionInfo : EqualityComparer<ChampionInfo> {
    public string Id { get; }
    public string Name { get; }
    
    public ChampionInfo(string id, string name)
    {
        Id = id;
        Name = name;
    }
    
    public override bool Equals(ChampionInfo? x, ChampionInfo? y)
    {
        if (x is null && y is null) return true;
        if (x is null || y is null) return false;
        return x.Id == y.Id;
    }
    
    public override int GetHashCode(ChampionInfo obj)
    {
        return obj.Id.GetHashCode();
    }
}