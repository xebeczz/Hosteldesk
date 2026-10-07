/* Shared API types (mirror backend schemas). */

export type Role = 'student' | 'warden' | 'admin'
export type Category = 'plumbing' | 'electrical' | 'wifi' | 'mess' | 'housekeeping' | 'security' | 'other'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type Status = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed'

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  is_active: boolean
  hostel_block: string | null
  room_number: string | null
  created_at: string
}

export interface Complaint {
  id: number
  title: string
  description: string
  category: Category
  priority: Priority
  status: Status
  room_number: string
  hostel_block: string
  photo_urls: string[]
  student_id: number
  assigned_warden_id: number | null
  sla_due: string | null
  created_at: string
  updated_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  closed_at: string | null
  student_name: string | null
  warden_name: string | null
  rating_score: number | null
  sla_breached: boolean
}

export interface Comment {
  id: number
  complaint_id: number
  user_id: number
  body: string
  created_at: string
  user_name: string | null
  user_role: string | null
}

export interface DashboardStats {
  total: number
  by_status: Record<string, number>
  by_category: Record<string, number>
  by_priority: Record<string, number>
  sla_breaches: number
  avg_resolution_hours: number | null
  avg_rating: number | null
  unassigned: number
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
  mode: 'online' | 'offline'
  suggested_draft: {
    category: string
    priority: string
    title: string
    description: string
  } | null
}

export const CATEGORY_LABELS: Record<Category, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  wifi: 'WiFi / Internet',
  mess: 'Mess / Food',
  housekeeping: 'Housekeeping',
  security: 'Security',
  other: 'Other',
}

export const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}
