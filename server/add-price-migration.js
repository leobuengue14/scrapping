const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addPriceColumn() {
  try {
    console.log('Adding price column to sources table...');

    // Add price column to sources table
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE sources ADD COLUMN IF NOT EXISTS price VARCHAR(100);
      `
    });

    if (addColumnError) {
      console.error('Error adding price column:', addColumnError);
    } else {
      console.log('✅ price column added to sources table successfully');
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

addPriceColumn(); 