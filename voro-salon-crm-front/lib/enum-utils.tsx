export function enumToOptions<T extends object>(enumObj: T) {
  return (Object.keys(enumObj) as Array<keyof T>)
    .filter((key) => isNaN(Number(key))) // ignora mapeamento reverso
    .map((key) => ({
      label: String(key),
      value: enumObj[key] as unknown as string
    }));
}
