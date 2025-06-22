-- Create the sources table
CREATE TABLE sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'sporting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the products table
CREATE TABLE products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    price VARCHAR(100),
    source_url TEXT NOT NULL,
    source_name VARCHAR(255) NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_sources_url ON sources(url);
CREATE INDEX idx_products_source_url ON products(source_url);
CREATE INDEX idx_products_scraped_at ON products(scraped_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can modify these based on your security needs)
CREATE POLICY "Allow public read access to sources" ON sources
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to sources" ON sources
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to sources" ON sources
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to sources" ON sources
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access to products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to products" ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to products" ON products
    FOR UPDATE USING (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 