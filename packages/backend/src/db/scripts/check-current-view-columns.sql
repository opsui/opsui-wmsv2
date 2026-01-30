-- Check if current_view columns exist in users table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND (column_name LIKE '%current_view%' OR column_name LIKE '%last_view%')
ORDER BY column_name;