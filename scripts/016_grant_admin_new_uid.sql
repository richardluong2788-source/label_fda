-- Grant admin role to specific user
-- User: hocluongvan88@gmail.com
-- UID: 51848991-2e66-4426-8a7c-fd10588c3a2f

-- Insert admin user record
INSERT INTO admin_users (user_id, role, can_review)
VALUES (
  '51848991-2e66-4426-8a7c-fd10588c3a2f',
  'superadmin',
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'superadmin',
  can_review = true;

-- Verify the insertion
SELECT * FROM admin_users WHERE user_id = '51848991-2e66-4426-8a7c-fd10588c3a2f';
