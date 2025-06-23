-- Add image column to products table
ALTER TABLE products ADD COLUMN image TEXT;

-- Optionally, update existing records if needed
-- UPDATE products SET image = '' WHERE image IS NULL; 