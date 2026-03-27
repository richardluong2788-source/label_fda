-- ============================================================
-- 018: Expert Review Requests
-- Tạo bảng theo dõi từng yêu cầu tư vấn chuyên gia riêng biệt
-- ============================================================

-- 1. Bảng chính
CREATE TABLE IF NOT EXISTS public.expert_review_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_report_id       uuid NOT NULL REFERENCES public.audit_reports(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL,

  -- Trạng thái luồng
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','in_review','completed','cancelled')),

  -- Thông tin user cung cấp khi gửi request
  user_context          text,           -- Bối cảnh sản phẩm / câu hỏi cụ thể
  target_market         text,           -- Thị trường mục tiêu (US, Canada...)
  product_category      text,           -- Ngành sản phẩm

  -- Quota / thanh toán
  is_paid               boolean NOT NULL DEFAULT false,  -- true = gói Pro/Enterprise hoặc đã trả lẻ
  plan_id               text,           -- Gói lúc tạo request

  -- Admin xử lý
  assigned_to           uuid,           -- Expert được giao
  assigned_at           timestamp with time zone,

  -- Kết quả review từ chuyên gia (structured)
  expert_summary        text,           -- Tóm tắt tổng quan
  violation_reviews     jsonb,          -- Array: [{violation_index, confirmed, wording_fix, legal_note}]
  recommended_actions   jsonb,          -- Array: [{action, priority, cfr_reference}]
  sign_off_name         text,           -- Tên chuyên gia ký
  sign_off_at           timestamp with time zone,
  sign_off_user_id      uuid,           -- user_id của expert

  -- Timestamps
  created_at            timestamp with time zone DEFAULT now(),
  updated_at            timestamp with time zone DEFAULT now()
);

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_expert_requests_report
  ON public.expert_review_requests(audit_report_id);
CREATE INDEX IF NOT EXISTS idx_expert_requests_user
  ON public.expert_review_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_requests_status
  ON public.expert_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_expert_requests_assigned
  ON public.expert_review_requests(assigned_to);

-- 3. RLS
ALTER TABLE public.expert_review_requests ENABLE ROW LEVEL SECURITY;

-- User xem request của chính mình
CREATE POLICY expert_req_select_own ON public.expert_review_requests
  FOR SELECT USING (auth.uid() = user_id);

-- User tạo request (chỉ cho report của họ)
CREATE POLICY expert_req_insert_own ON public.expert_review_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User huỷ request của mình (chỉ khi còn pending)
CREATE POLICY expert_req_cancel_own ON public.expert_review_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admin đọc tất cả
CREATE POLICY expert_req_admin_select ON public.expert_review_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
        AND role IN ('admin','superadmin','expert')
    )
  );

-- Admin cập nhật (review, sign-off, assign)
CREATE POLICY expert_req_admin_update ON public.expert_review_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
        AND role IN ('admin','superadmin','expert')
    )
  );

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_expert_req_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expert_req_updated_at ON public.expert_review_requests;
CREATE TRIGGER trg_expert_req_updated_at
  BEFORE UPDATE ON public.expert_review_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_expert_req_updated_at();

-- 5. Hàm kiểm tra quota expert review
-- Trả về {can_request, reason, reviews_used, reviews_limit}
CREATE OR REPLACE FUNCTION public.check_expert_review_quota(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sub       record;
  v_plan      record;
  v_used      int;
  v_limit     int;
  v_is_admin  boolean;
BEGIN
  -- Admin luôn được bypass
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = p_user_id
      AND role IN ('admin','superadmin','expert')
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'can_request', true,
      'reason',       'admin_bypass',
      'reviews_used', 0,
      'reviews_limit', -1
    );
  END IF;

  -- Lấy subscription hiện tại
  SELECT * INTO v_sub
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND current_period_end > now()
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object(
      'can_request', false,
      'reason',       'no_active_subscription',
      'reviews_used', 0,
      'reviews_limit', 0
    );
  END IF;

  -- Lấy plan
  SELECT * INTO v_plan
  FROM public.subscription_plans
  WHERE id = v_sub.plan_id;

  v_limit := COALESCE(v_plan.expert_reviews_limit, 0);
  v_used  := COALESCE(v_sub.expert_reviews_used, 0);

  -- -1 = unlimited
  IF v_limit = -1 THEN
    RETURN jsonb_build_object(
      'can_request', true,
      'reason',       'unlimited',
      'reviews_used', v_used,
      'reviews_limit', -1,
      'plan_name',    v_plan.name
    );
  END IF;

  IF v_used >= v_limit THEN
    RETURN jsonb_build_object(
      'can_request', false,
      'reason',       'quota_exceeded',
      'reviews_used', v_used,
      'reviews_limit', v_limit,
      'plan_name',    v_plan.name
    );
  END IF;

  RETURN jsonb_build_object(
    'can_request', true,
    'reason',       'ok',
    'reviews_used', v_used,
    'reviews_limit', v_limit,
    'plan_name',    v_plan.name
  );
END;
$$;
