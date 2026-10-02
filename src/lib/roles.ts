export const EXECUTIVE_ASSOCIATION_TITLES = ['협회장', '총무', '사무국장'] as const;

export function isExecutiveAssociationTitle(value: string | null | undefined) {
  return EXECUTIVE_ASSOCIATION_TITLES.some((title) => title === value);
}
