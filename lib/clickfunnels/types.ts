/**
 * Type definitions for ClickFunnels API responses
 * https://developers.myclickfunnels.com/docs/intro
 */

export interface CfApiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
    };
  };
}

export interface CfOrder {
  id: string;
  customer_email?: string | null;
  customer_name?: string | null;
  total_amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CfFulfillment {
  id: string;
  order_id: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiErrorResponse {
  errors?: Array<{ message: string; code?: string }>;
  message?: string;
}
