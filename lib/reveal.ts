export function nextStepIndex(current: number, total: number): number {
  if (total <= 0) return -1;
  return current + 1 < total ? current + 1 : -1;
}
