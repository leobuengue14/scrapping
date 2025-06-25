const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  try {
    console.log('Creating product_catalog table...');

    // Try to insert a test record to see if table exists
    const { data, error } = await supabase
      .from('product_catalog')
      .insert([{ name: 'test-product' }])
      .select();

    if (error) {
      console.log('Table does not exist or has different structure. Error:', error.message);
      console.log('Please create the table manually in Supabase dashboard with the following SQL:');
      console.log(`
        CREATE TABLE product_catalog (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        ALTER TABLE sources ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES product_catalog(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_sources_product_id ON sources(product_id);
        CREATE INDEX IF NOT EXISTS idx_product_catalog_name ON product_catalog(name);

        ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Allow all operations for authenticated users" ON product_catalog
          FOR ALL USING (auth.role() = 'authenticated');

        CREATE POLICY "Allow all operations for service role" ON product_catalog
          FOR ALL USING (auth.role() = 'service_role');
      `);
    } else {
      console.log('✅ product_catalog table exists and is working!');
      // Delete the test record
      await supabase
        .from('product_catalog')
        .delete()
        .eq('name', 'test-product');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createTables(); 