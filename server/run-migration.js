const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration...');

    // Create product_catalog table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS product_catalog (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createTableError) {
      console.error('Error creating product_catalog table:', createTableError);
    } else {
      console.log('✅ product_catalog table created successfully');
    }

    // Add product_id column to sources table
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE sources ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES product_catalog(id) ON DELETE SET NULL;
      `
    });

    if (addColumnError) {
      console.error('Error adding product_id column:', addColumnError);
    } else {
      console.log('✅ product_id column added to sources table');
    }

    // Create indexes
    const { error: indexError1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_sources_product_id ON sources(product_id);
      `
    });

    const { error: indexError2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_product_catalog_name ON product_catalog(name);
      `
    });

    if (indexError1 || indexError2) {
      console.error('Error creating indexes:', indexError1 || indexError2);
    } else {
      console.log('✅ Indexes created successfully');
    }

    // Enable RLS and create policies
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
      `
    });

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled on product_catalog table');
    }

    // Create policies
    const { error: policyError1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow all operations for authenticated users" ON product_catalog
          FOR ALL USING (auth.role() = 'authenticated');
      `
    });

    const { error: policyError2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY IF NOT EXISTS "Allow all operations for service role" ON product_catalog
          FOR ALL USING (auth.role() = 'service_role');
      `
    });

    if (policyError1 || policyError2) {
      console.error('Error creating policies:', policyError1 || policyError2);
    } else {
      console.log('✅ Policies created successfully');
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration(); 