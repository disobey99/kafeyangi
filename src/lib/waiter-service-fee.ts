export function computeOrderTotals(input: {
  subtotalAmount: number;
  discountAmount: number;
  hasWaiter: boolean;
  waiterServiceFeePercent: number;
}) {
  const baseTotal = Math.max(0, input.subtotalAmount - input.discountAmount);
  const serviceFeeAmount =
    input.hasWaiter && input.waiterServiceFeePercent > 0
      ? Math.round((baseTotal * input.waiterServiceFeePercent) / 100)
      : 0;
  const totalAmount = baseTotal + serviceFeeAmount;
  return { baseTotal, serviceFeeAmount, totalAmount };
}
