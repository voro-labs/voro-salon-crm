namespace VoroSwipeEntertainment.Application.Responses
{
    public class TmdbResponse<T>
    {
        public List<T> Results { get; set; } = [];
    }

    public class TmdbMovieResult
    {
        public int Id { get; set; }
        public string Title { get; set; } = default!;
        public string? Release_Date { get; set; }
        public List<int> Genre_Ids { get; set; } = [];
        public string Overview { get; set; } = default!;
        public string? Poster_Path { get; set; }
    }

    public class TmdbSeriesResult
    {
        public int Id { get; set; }
        public string Name { get; set; } = default!;
        public string? First_Air_Date { get; set; }
        public List<int> Genre_Ids { get; set; } = [];
        public string Overview { get; set; } = default!;
        public string? Poster_Path { get; set; }
    }
}
