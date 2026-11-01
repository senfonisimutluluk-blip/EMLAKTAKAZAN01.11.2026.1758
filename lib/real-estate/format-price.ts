export const formatPrice = (price: number) => price >= 1000000
  ? `${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)} M TL`
  : `${new Intl.NumberFormat('tr-TR').format(price)} TL`;
