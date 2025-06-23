// Test script to verify price formatting
const formatPrice = (price) => {
  if (!price) return 'N/A';
  
  // Convert to string if it's a number
  let priceStr = typeof price === 'number' ? price.toString() : price;
  
  // Remove any existing currency symbols and spaces
  priceStr = priceStr.replace(/[$\s]/g, '');
  
  // Handle Argentine format where dots are thousand separators
  // Convert "179.999" to "179999"
  if (priceStr.includes('.')) {
    priceStr = priceStr.replace(/\./g, '');
  }
  
  // Convert to number
  const numericPrice = parseInt(priceStr);
  
  if (isNaN(numericPrice)) return 'N/A';
  
  // Format as Argentine peso currency
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(numericPrice);
};

// Test cases
const testCases = [
  '179.999',    // Sporting format
  '149999',     // TiendaRiver format
  '3400',       // Dia format
  '486500',     // Old Coto format (incorrect)
  '4865',       // New Coto format (correct)
  '99999',      // Another format
  '169999'      // Another format
];

console.log('Testing price formatting:');
testCases.forEach(price => {
  console.log(`${price} -> ${formatPrice(price)}`);
}); 