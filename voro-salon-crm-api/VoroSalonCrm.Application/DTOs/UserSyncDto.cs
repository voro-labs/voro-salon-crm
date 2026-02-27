namespace VoroSwipeEntertainment.Application.DTOs
{
    public class UserSyncDto
    {
        public IEnumerable<MediaItemDto>? Liked { get; set; }
        public IEnumerable<MediaItemDto>? Disliked { get; set; }
        public IEnumerable<MediaItemDto>? SuperLiked { get; set; }

        public IEnumerable<UserMediaInteractionDto>? History { get; set; }

        public UserExtensionDto? Profile { get; set; }

        public bool? HasCompletedOnboarding { get; set; }
    }
}
