namespace VoroSwipeEntertainment.Shared.Extensions
{
    public static class ListExtension
    {
        public static bool SameValues(this List<int> origin, List<int> compare)
        {
            return origin.Count == compare.Count &&
                !origin.Except(compare).Any() &&
                !compare.Except(origin).Any();
        }
    }
}
