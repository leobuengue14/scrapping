-- Create product_catalog table for base products
CREATE TABLE IF NOT EXISTS product_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add product_id column to sources table to link sources to products
ALTER TABLE sources ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES product_catalog(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sources_product_id ON sources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_name ON product_catalog(name);

-- Add RLS policies for product_catalog table
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON product_catalog
    FOR ALL USING (auth.role() = 'authenticated');

-- Policy to allow all operations for service role
CREATE POLICY "Allow all operations for service role" ON product_catalog
    FOR ALL USING (auth.role() = 'service_role'); 