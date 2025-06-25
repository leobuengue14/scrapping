const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDataTable() {
  try {
    console.log('Creating data table...');

    // Create data table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS data (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            product_id UUID REFERENCES product_catalog(id) ON DELETE CASCADE,
            source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
            name VARCHAR(500) NOT NULL,
            price VARCHAR(100),
            url TEXT NOT NULL,
            image TEXT,
            scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createTableError) {
      console.error('Error creating data table:', createTableError);
      return;
    }

    // Create indexes
    const { error: index1Error } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_data_product_id ON data(product_id);`
    });

    const { error: index2Error } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_data_source_id ON data(source_id);`
    });

    const { error: index3Error } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_data_scraped_at ON data(scraped_at);`
    });

    if (index1Error || index2Error || index3Error) {
      console.error('Error creating indexes:', { index1Error, index2Error, index3Error });
    } else {
      console.log('Data table and indexes created successfully!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createDataTable(); 