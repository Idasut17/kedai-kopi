-- Add drive_file_id column to product_images table
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(255) AFTER image_url;
