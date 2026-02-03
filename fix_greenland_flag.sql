-- Fix Greenland's incorrect flag value in database
-- Problem: flag field contains "GR" (Greece) instead of "GL" (Greenland)
-- This causes Greece to be colored when Greenland is wishlisted

UPDATE countries 
SET flag = 'GL'
WHERE name = 'Greenland' 
  AND flag = 'GR';

-- Verify the fix
SELECT id, name, flag, continent 
FROM countries 
WHERE name = 'Greenland';
