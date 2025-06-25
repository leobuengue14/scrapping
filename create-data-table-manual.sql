-- Create data table to store scraping results
-- Run this in your Supabase SQL editor

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_product_id ON data(product_id);
CREATE INDEX IF NOT EXISTS idx_data_source_id ON data(source_id);
CREATE INDEX IF NOT EXISTS idx_data_scraped_at ON data(scraped_at);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on data" ON data
    FOR ALL USING (true); 