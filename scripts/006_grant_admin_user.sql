-- Add admin user: hocluongvan88@gmail.com
-- User UID: 2e89bd83-6c7b-43c1-9df6-323688d73519

INSERT INTO public.admin_users (user_id, role, can_review)
VALUES ('2e89bd83-6c7b-43c1-9df6-323688d73519', 'superadmin', true)
ON CONFLICT (user_id) DO UPDATE
SET role = 'superadmin', can_review = true;

-- Verify the admin user was added
SELECT user_id, role, can_review, created_at
FROM public.admin_users
WHERE user_id = '2e89bd83-6c7b-43c1-9df6-323688d73519';
