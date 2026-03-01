-- Grant admin role to specific user
-- User: hocluongvan88@gmail.com
-- UID: 2e89bd83-6c7b-43c1-9df6-323688d73519

-- Insert admin user record
INSERT INTO admin_users (user_id, role, can_review)
VALUES (
  '2e89bd83-6c7b-43c1-9df6-323688d73519',
  'superadmin',
  true
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'superadmin',
  can_review = true;

-- Verify the insertion
SELECT * FROM admin_users WHERE user_id = '2e89bd83-6c7b-43c1-9df6-323688d73519';
