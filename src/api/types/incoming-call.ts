export interface IncomingCallCustomer {
  id: string;
  name: string;
  address: string;
  email: string | null;
  phone: string;
}

export interface IncomingCallService {
  id: string;
  job_type: string;
  date: string | null;
  status: string;
}

export interface IncomingCallWorkOrder {
  id: string;
  job_type: string;
  status: string;
  scheduled_date: string | null;
}

export interface IncomingCallPayload {
  call_sid: string;
  caller_number: string;
  caller_display: string;
  customer: IncomingCallCustomer | null;
  last_service: IncomingCallService | null;
  open_work_orders: IncomingCallWorkOrder[];
  call_log_id: string;
}

export interface CallEndedPayload {
  call_sid: string;
  call_log_id: string;
  duration: number | null;
  disposition: string;
}

export interface CallAnalyzedPayload {
  call_log_id: string;
  has_transcript: boolean;
  has_analysis: boolean;
}
