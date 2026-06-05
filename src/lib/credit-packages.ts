export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  priceKrw: number;
  badge?: string;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "starter",
    name: "스타터",
    credits: 10,
    priceKrw: 1990,
  },
  {
    id: "standard",
    name: "스탠다드",
    credits: 30,
    priceKrw: 4900,
    badge: "인기",
  },
  {
    id: "pro",
    name: "프로",
    credits: 100,
    priceKrw: 14900,
  },
];

export function getCreditPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}

export function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

/** 패키지·잔액 표시용 — 하루 기준 회수임을 명시 */
export function formatDailyCredits(count: number) {
  return `하루/${count}회`;
}
