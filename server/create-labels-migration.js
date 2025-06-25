const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createLabelsTable() {
  try {
    console.log('Creating Labels table...');
    
    // Read the SQL file
    const fs = require('fs');
    const sql = fs.readFileSync('create-labels-table.sql', 'utf8');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error creating labels table:', error);
    } else {
      console.log('Labels table created successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

createLabelsTable(); 