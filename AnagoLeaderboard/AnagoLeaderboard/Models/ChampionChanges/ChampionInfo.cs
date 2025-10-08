namespace AnagoLeaderboard.Models;

public class ChampionInfo : EqualityComparer<ChampionInfo> {
    public string Id { get; }
    public string Name { get; }
    
    public ChampionInfo(string id, string name)
    {
        Id = id;
        Name = name;
    }
    
    public string GetDisplayName()
    {
        int index = Name.IndexOfAny(new char[] { ' ', '\t', '\n', '\r' });

        string firstWord = index == -1 ? Name : Name.Substring(0, index);

        return firstWord;
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