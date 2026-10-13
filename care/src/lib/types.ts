export type ProviderType = 'yoga_teacher' | 'physiotherapist';
export type ProviderStatus = 'pending' | 'approved' | 'rejected';
export type OfferingKind = 'physio_clinic' | 'physio_home' | 'yoga_group' | 'yoga_home';
export type AdminScope = 'yoga' | 'physio';

export interface Provider {
  id: string;
  user_id: string;
  provider_type: ProviderType;
  full_name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  certificate_no: string;
  certificate_path: string;
  status: ProviderStatus;
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Availability {
  id: string;
  offering_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface Offering {
  id: string;
  provider_id: string;
  kind: OfferingKind;
  label: string | null;
  slot_minutes: number;
  rate_per_session: number | null;
  rate_per_month: number | null;
  availability: Availability[];
}

/** URL slug <-> database value */
export const typeFromSlug = (s?: string): ProviderType | null =>
  s === 'yoga' ? 'yoga_teacher' : s === 'physio' ? 'physiotherapist' : null;
export const slugFromType = (t: ProviderType): 'yoga' | 'physio' => (t === 'yoga_teacher' ? 'yoga' : 'physio');
export const TYPE_LABEL: Record<ProviderType, string> = { yoga_teacher: 'Yoga Teacher', physiotherapist: 'Physiotherapist' };

export const WEEKDAYS = [
  { v: 1, l: 'Mon' }, { v: 2, l: 'Tue' }, { v: 3, l: 'Wed' }, { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' }, { v: 6, l: 'Sat' }, { v: 0, l: 'Sun' },
];

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
