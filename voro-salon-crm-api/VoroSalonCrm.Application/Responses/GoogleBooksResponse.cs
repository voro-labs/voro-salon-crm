namespace VoroSwipeEntertainment.Application.Responses
{
    public class GoogleBooksResponse
    {
        public List<GoogleBookResult>? Items { get; set; }
    }

    public class GoogleBookResult
    {
        public string Id { get; set; } = default!;
        public VolumeInfo VolumeInfo { get; set; } = null!;
    }

    public class VolumeInfo
    {
        public string Title { get; set; } = default!;
        public string? Description { get; set; }
        public string? PublishedDate { get; set; }
        public ImageLinks? ImageLinks { get; set; }
        public List<string>? Categories { get; set; }
    }

    public class ImageLinks
    {
        public string? Thumbnail { get; set; }
    }
}
