
import Dexie, { type Table } from "dexie";

// Attendance status
export type LocalAttendanceStatus = "Present" | "Absent";

// Attendance record stored locally in the browser
export interface LocalAttendance {
  id?: number;
  student_id: number;
  attendance_date: string;
  subject: string;
  semester: number;
  status: LocalAttendanceStatus;
  syncStatus: "pending" | "synced" | "failed";
  updatedAt: string;
}

// Queue for attendance records waiting to sync
export interface AttendanceSyncQueue {
  id?: number;
  student_id: number;
  attendance_date: string;
  subject: string;
  semester: number;
  status: LocalAttendanceStatus;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

// CampusFlow local database
class CampusFlowDatabase extends Dexie {
  attendance!: Table<LocalAttendance, number>;
  syncQueue!: Table<AttendanceSyncQueue, number>;

  constructor() {
    super("CampusFlowDatabase");

    this.version(1).stores({
      attendance:
        "++id, student_id, attendance_date, subject, semester, syncStatus, &[student_id+attendance_date+subject]",

      syncQueue:
        "++id, student_id, attendance_date, subject, semester, createdAt",
    });
  }
}

// Create database instance
export const db = new CampusFlowDatabase();
