const UNKNOWN_CONDITION = 'Condición desconocida';

const CONDITION_GROUPS: readonly {
  readonly condition: string;
  readonly codes: readonly number[];
}[] = [
  { condition: 'Despejado', codes: [0] },
  { condition: 'Parcialmente nublado', codes: [1, 2] },
  { condition: 'Nublado', codes: [3] },
  { condition: 'Niebla', codes: [45, 48] },
  { condition: 'Llovizna', codes: [51, 53, 55, 56, 57] },
  { condition: 'Lluvia', codes: [61, 63, 65, 66, 67, 80, 81, 82] },
  { condition: 'Nieve', codes: [71, 73, 75, 77, 85, 86] },
  { condition: 'Tormenta', codes: [95, 96, 99] },
];

const conditionByCode: ReadonlyMap<number, string> = new Map(
  CONDITION_GROUPS.flatMap((group) => group.codes.map((code) => [code, group.condition] as const)),
);

export const describeWeatherCode = (code: number): string =>
  conditionByCode.get(code) ?? UNKNOWN_CONDITION;
