namespace VoroSalonCrm.Shared.Helpers
{
    public static class CollectionSyncHelper
    {
        public static void Sync<TDb, TDto, TKey>(
             ICollection<TDb> dbItems,
             ICollection<TDto> dtoItems,
             Func<TDb, TKey> dbKey,
             Func<TDto, TKey?> dtoKey,
             Func<TDto, TDb> onCreate,
             Action<TDb, TDto> onUpdate,
             Action<TDb> onDelete
             )
             where TKey : struct
        {
            var dtoItemsWithKey = dtoItems
                .Where(d => !dtoKey(d).Equals(default))
                .ToList();

            var dtoItemsNew = dtoItems
                .Where(d => dtoKey(d).Equals(default))
                .ToList();

            foreach (var dto in dtoItemsWithKey)
            {
                var key = dtoKey(dto);
                var dbItem = dbItems.FirstOrDefault(db => dbKey(db).Equals(key));

                if (dbItem == null)
                {
                    dbItems.Add(onCreate(dto));
                    continue;
                }

                onUpdate(dbItem, dto);
            }

            foreach (var dto in dtoItemsNew)
            {
                dbItems.Add(onCreate(dto));
            }

            // REGRA CRÍTICA:
            // se o DTO não trouxe nenhum item com Id,
            // ele NÃO representa o estado completo da coleção
            if (dtoItemsWithKey.Count == 0)
                return;

            var dtoKeys = dtoItemsWithKey.Select(dtoKey).ToHashSet();

            foreach (var db in dbItems
                .Where(db => !dtoKeys.Contains(dbKey(db)))
                .ToList())
            {
                onDelete(db);
            }
        }
    }
}
