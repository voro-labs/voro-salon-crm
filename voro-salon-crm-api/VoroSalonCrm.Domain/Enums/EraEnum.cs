namespace VoroSwipeEntertainment.Domain.Enums
{
    public enum EraEnum
    {
        Unspecified = 0,
        _1970s = 100,
        _1980s = 200,
        _1990s = 300,
        _2000s = 400,
        _2010s = 500,
        _2020Plus = 600
    }

    public static class EraHelper
    {
        public static EraEnum GetEraFromYear(int year)
        {
            if (year >= 2020) return EraEnum._2020Plus;
            if (year >= 2010) return EraEnum._2010s;
            if (year >= 2000) return EraEnum._2000s;
            if (year >= 1990) return EraEnum._1990s;
            if (year >= 1980) return EraEnum._1980s;
            if (year >= 1970) return EraEnum._1970s;
            
            return EraEnum.Unspecified;
        }
    }
}
