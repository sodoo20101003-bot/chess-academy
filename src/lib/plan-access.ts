/**
 * Plan access — хэрэглэгчийн plan-аар тогтоосон эрхүүд.
 *
 * 3 plan:
 *   basic        — Үндсэн хичээлүүд, нийтийн chat
 *   pro          — basic + дунд түвшний хичээлүүд + багш захиалах эрх
 *   grandmaster  — Бүх хичээл + багш захиалах эрх
 */

export type PlanTier = 'basic' | 'pro' | 'grandmaster';

export const PLAN_TIER_ORDER: Record<PlanTier, number> = {
  basic: 1,
  pro: 2,
  grandmaster: 3,
};

export const TIER_LABEL_MN: Record<PlanTier, string> = {
  basic: 'Basic',
  pro: 'Pro',
  grandmaster: 'Grandmaster',
};

/**
 * Хэрэглэгч тухайн tier-ийн хичээлийг үзэх эрхтэй эсэх.
 */
export function canAccessLesson(
  userTier: PlanTier | null | undefined,
  lessonTier: PlanTier
): boolean {
  if (!userTier) return false;
  return PLAN_TIER_ORDER[userTier] >= PLAN_TIER_ORDER[lessonTier];
}

/**
 * Бүх нэвтэрсэн хэрэглэгч нэг л нийтийн chat-д бичнэ.
 */
export function canUsePublicChat(_userTier: PlanTier | null | undefined): boolean {
  return true;
}

export const PUBLIC_CHAT_ROOM = 'public' as const;

export function getChatRoomForTier(_userTier: PlanTier | null | undefined): string {
  return PUBLIC_CHAT_ROOM;
}

/**
 * Багш захиалж болох эсэх — зөвхөн pro, grandmaster.
 */
export function canBookTeacher(userTier: PlanTier | null | undefined): boolean {
  if (!userTier) return false;
  return userTier === 'pro' || userTier === 'grandmaster';
}

/**
 * `canBookTeacher`-ийн legacy alias.
 * Хуучин код (OneOnOneBooking гэх мэт) `canBookOneOnOne` гэж дуудаж байсан тул нэмсэн.
 */
export function canBookOneOnOne(userTier: PlanTier | null | undefined): boolean {
  return canBookTeacher(userTier);
}

/**
 * profile.plan_tier утгыг PlanTier эсвэл null гэж буцаана.
 * Хуучин код (ChatProvider гэх мэт) backwards-compat үүднээс үлдээсэн.
 */
export function getEffectiveTier(
  tier: string | null | undefined
): PlanTier | null {
  if (tier === 'basic' || tier === 'pro' || tier === 'grandmaster') {
    return tier;
  }
  return null;
}
