const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function formatPrice(raw) {
  // Si ya está bien formateado, devolver igual
  if (/^\d{2,3}\.\d{3}$/.test(raw)) return raw;
  // Si es solo números, agregar punto antes de los últimos 3 dígitos
  if (/^\d{5,6}$/.test(raw)) {
    return raw.slice(0, raw.length - 3) + '.' + raw.slice(-3);
  }
  // Si tiene más de un punto, dejar solo el primero
  if (/^(\d+\.){2,}\d+$/.test(raw)) {
    const parts = raw.split('.');
    return parts[0] + '.' + parts.slice(1).join('');
  }
  // Si tiene coma, reemplazar por punto
  if (/^\d{2,3},\d{3}$/.test(raw)) {
    return raw.replace(',', '.');
  }
  // Si tiene varios precios concatenados, tomar solo los primeros 6 dígitos
  if (/^\d{10,}$/.test(raw)) {
    return raw.slice(0, raw.length / 2).slice(0, 6).replace(/(\d{3})$/, '.$1');
  }
  // Si tiene formato $xxx.xxx, quitar el símbolo
  if (/^\$\s*\d{2,3}\.\d{3}$/.test(raw)) {
    return raw.replace(/[^\d.]/g, '');
  }
  // Si no matchea nada, devolver igual
  return raw;
}

async function fixSportingPrices() {
  // Buscar productos de Sporting con precios mal formateados
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .ilike('source_name', '%sporting%');

  if (error) {
    console.error('Error fetching Sporting products:', error);
    return;
  }

  let updated = 0;
  for (const product of products) {
    const oldPrice = product.price;
    const newPrice = formatPrice(oldPrice);
    if (oldPrice !== newPrice) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', product.id);
      if (updateError) {
        console.error(`Error updating product ${product.id}:`, updateError);
      } else {
        console.log(`Updated product ${product.name}: ${oldPrice} -> ${newPrice}`);
        updated++;
      }
    }
  }
  console.log(`Done. Updated ${updated} Sporting product prices.`);
}

fixSportingPrices(); 