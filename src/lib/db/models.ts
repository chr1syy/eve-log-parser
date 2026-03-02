import type { ParsedLog } from "@/lib/types";

export interface LogMetadata {
  combat_duration_ms?: number;
  file_size?: number;
  entries_count?: number;
}

export interface Log {
  id: string;
  user_id: string;
  filename: string;
  uploaded_at: Date;
  log_data: ParsedLog;
  metadata: LogMetadata | null;
  created_at: Date;
}
