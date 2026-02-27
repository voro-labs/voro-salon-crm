namespace VoroSwipeEntertainment.Application.Responses
{
    public class AnilistResponse
    {
        public AnilistData Data { get; set; } = null!;
    }

    public class AnilistData
    {
        public AnilistPage Page { get; set; } = null!;
    }

    public class AnilistPage
    {
        public List<AnilistMedia> Media { get; set; } = [];
    }

    public class AnilistMedia
    {
        public int Id { get; set; }
        public AnilistTitle Title { get; set; } = null!;
        public List<string> Genres { get; set; } = [];
        public string? Description { get; set; }
        public int? SeasonYear { get; set; }
        public AnilistCoverImage CoverImage { get; set; } = null!;
        public int? AverageScore { get; set; }
    }

    public class AnilistTitle
    {
        public string? English { get; set; }
        public string? Romaji { get; set; }
    }

    public class AnilistCoverImage
    {
        public string Large { get; set; } = default!;
    }
}
