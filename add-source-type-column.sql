-- Add source_type column to products table
ALTER TABLE products ADD COLUMN source_type VARCHAR(50);

-- Create index for better performance
CREATE INDEX idx_products_source_type ON products(source_type);

-- Update existing records to have a default source_type based on source_name
UPDATE products 
SET source_type = CASE 
    WHEN source_name LIKE 'Sporting%' THEN 'sporting'
    WHEN source_name LIKE 'Tiendariver%' THEN 'tiendariver'
    ELSE 'unknown'
END; 