// Currency data with exchange rates relative to SGD
const currencyData = {
  SG: { symbol: '$', code: 'SGD', display: 'SGD ($)', rate: 1.0 },
  MY: { symbol: 'RM', code: 'MYR', display: 'MYR (RM)', rate: 3.48 },
  CN: { symbol: '¥', code: 'CNY', display: 'CNY (¥)', rate: 5.35 },
  ID: { symbol: 'Rp', code: 'IDR', display: 'IDR (Rp)', rate: 11850.0 },
  KR: { symbol: '₩', code: 'KRW', display: 'KRW (₩)', rate: 1010.0 },
  JP: { symbol: '¥', code: 'JPY', display: 'JPY (¥)', rate: 112.0 },
  TH: { symbol: '฿', code: 'THB', display: 'THB (฿)', rate: 26.5 },
  VN: { symbol: '₫', code: 'VND', display: 'VND (₫)', rate: 18500.0 },
  PH: { symbol: '₱', code: 'PHP', display: 'PHP (₱)', rate: 43.0 },
  HK: { symbol: 'HK$', code: 'HKD', display: 'HKD (HK$)', rate: 5.8 },
};

window.currencyData = currencyData;

const convertCurrencyWithSymbol = (price) => {
  const currentCountry = localStorage.getItem('country') || 'SG';
  const exchangeRate = currencyData[currentCountry]?.rate ?? 1.0;
  const symbol = currencyData[currentCountry]?.symbol ?? '$';
  return `${symbol} ${(price * exchangeRate).toFixed(2)}`;
};

window.convertCurrencyWithSymbol = convertCurrencyWithSymbol;
