-- Create Labels table
CREATE TABLE IF NOT EXISTS labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_labels junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS product_labels (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES product_catalog(id) ON DELETE CASCADE,
    label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, label_id)
);

-- Insert some default labels
INSERT INTO labels (name, color) VALUES 
    ('Oferta', '#EF4444'),
    ('Nuevo', '#10B981'),
    ('Popular', '#F59E0B'),
    ('Destacado', '#8B5CF6')
ON CONFLICT (name) DO NOTHING; 