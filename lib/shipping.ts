export const STANDARD_POSTAGE = 3.99;
export const FREE_SHIPPING_THRESHOLD = 50;

export function calculatePostage(subtotal: number) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_POSTAGE;
}

export function qualifiesForFreeShipping(subtotal: number) {
  return calculatePostage(subtotal) === 0;
}
