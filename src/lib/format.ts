export function formatRwf(amount: number) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-RW").format(n);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-RW", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function formatMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-RW", {
    year: "numeric",
    month: "long",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-RW", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
