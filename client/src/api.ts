import { supabase } from "./supabase";

const API_BASE_URL = "http://localhost:4000/api";

// ==========================================
// AUTHENTICATED API FETCH
// ==========================================

async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw new Error(error.message);

  if (!session?.access_token) {
    throw new Error("Please log in to continue.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);

  return fetch(url, { ...options, headers });
}

// ===============================
// STUDENT TYPES
// ===============================

export type Student = {
  dbId: number;
  id: string;
  name: string;
  programme: string;
  attendance: number;
  marks: number;
  status: "Good" | "Monitor" | "At Risk";
  email: string;
};

export type StudentInput = {
  roll_number: string;
  full_name: string;
  email: string;
  programme: string;
  attendance: number;
  internal_marks: number;
};

type DatabaseStudent = {
  id: number;
  roll_number: string;
  full_name: string;
  email: string;
  programme: string;
  attendance: number | string;
  internal_marks: number | string;
};

// ===============================
// ATTENDANCE TYPES
// ===============================

export type AttendanceStatus = "Present" | "Absent";

export type AttendanceRecord = {
  id: number;
  student_id: number;
  attendance_date: string;
  subject: string;
  semester: number;
  status: AttendanceStatus;
};

// ===============================
// COMMON RESPONSE HANDLER
// ===============================

async function handleResponse(response: Response) {
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message || `Request failed (${response.status})`
    );
  }

  return result;
}

function calculateStatus(
  attendance: number,
  marks: number
): Student["status"] {
  if (attendance < 70 || marks < 50) return "At Risk";
  if (attendance < 80 || marks < 65) return "Monitor";
  return "Good";
}

function formatStudent(data: DatabaseStudent): Student {
  const attendance = Number(data.attendance);
  const marks = Number(data.internal_marks);

  return {
    dbId: Number(data.id),
    id: data.roll_number,
    name: data.full_name,
    programme: data.programme,
    attendance,
    marks,
    status: calculateStatus(attendance, marks),
    email: data.email,
  };
}

// ===============================
// STUDENT CRUD OPERATIONS
// ===============================

export async function getStudents(): Promise<Student[]> {
  const response = await apiFetch(`${API_BASE_URL}/students`);
  const result = await handleResponse(response);

  return (result.students || []).map(formatStudent);
}

export async function createStudent(
  student: StudentInput
): Promise<Student> {
  const response = await apiFetch(`${API_BASE_URL}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });

  const result = await handleResponse(response);
  return formatStudent(result.student);
}

export async function updateStudent(
  dbId: number,
  student: StudentInput
): Promise<Student> {
  const response = await apiFetch(`${API_BASE_URL}/students/${dbId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });

  const result = await handleResponse(response);
  return formatStudent(result.student);
}

export async function deleteStudent(dbId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/students/${dbId}`, {
    method: "DELETE",
  });

  await handleResponse(response);
}

// ===============================
// ATTENDANCE OPERATIONS
// ===============================

export async function getAttendance(): Promise<AttendanceRecord[]> {
  const response = await apiFetch(`${API_BASE_URL}/attendance`);
  const result = await handleResponse(response);

  return result.attendance || [];
}

export async function markAttendance(
  record: Omit<AttendanceRecord, "id">
): Promise<AttendanceRecord> {
  const response = await apiFetch(`${API_BASE_URL}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });

  const result = await handleResponse(response);
  return result.record;
}

// ===============================
// INTERNAL MARKS
// ===============================

export type Assessment = {
  id: number;
  title: string;
  subject: string;
  semester: number;
  max_marks: number;
  assessment_date: string;
  is_locked: boolean;
  created_at: string;
};

export type StudentMark = {
  id: number;
  assessment_id: number;
  student_id: number;
  marks_obtained: number;
  updated_at: string;
  students: {
    id: number;
    roll_number: string;
    full_name: string;
    programme: string;
  };
};

export async function getAssessments(): Promise<Assessment[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/internals/assessments`
  );

  const result = await handleResponse(response);
  return result.assessments || [];
}

export async function createAssessment(
  assessment: Omit<
    Assessment,
    "id" | "is_locked" | "created_at"
  >
): Promise<Assessment> {
  const response = await apiFetch(
    `${API_BASE_URL}/internals/assessments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assessment),
    }
  );

  const result = await handleResponse(response);
  return result.assessment;
}

export async function getAssessmentMarks(
  assessmentId: number
): Promise<StudentMark[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/internals/assessments/${assessmentId}/marks`
  );

  const result = await handleResponse(response);
  return result.marks || [];
}

export async function saveStudentMark(
  assessmentId: number,
  studentId: number,
  marksObtained: number
): Promise<StudentMark> {
  const response = await apiFetch(
    `${API_BASE_URL}/internals/assessments/${assessmentId}/marks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        marks_obtained: marksObtained,
      }),
    }
  );

  const result = await handleResponse(response);
  return result.mark;
}

export async function lockAssessment(
  assessmentId: number
): Promise<Assessment> {
  const response = await apiFetch(
    `${API_BASE_URL}/internals/assessments/${assessmentId}/lock`,
    {
      method: "POST",
    }
  );

  const result = await handleResponse(response);
  return result.assessment;
}

// ===============================
// FEE MANAGEMENT
// ===============================

export interface StudentFee {
  id: number;
  student_id: number;
  semester: number;
  total_amount: number;
  paid_amount: number;
  due_date: string;
  status: "Paid" | "Pending" | "Overdue";

  students?: {
    id: number;
    roll_number: string;
    full_name: string;
    department: string;
    email: string;
  };
}

export interface FeeSummary {
  totalFees: number;
  collected: number;
  pending: number;
  overdue: number;
}

export interface FeePayment {
  id: number;
  student_fee_id: number;
  amount: number;
  payment_method: string;
  transaction_reference: string;
  payment_date: string;
}

export interface FeeReceipt {
  reference: string;
  amount: number;
  payment_method: string;
  payment_date: string;
}

export async function getFeeSummary(): Promise<FeeSummary> {
  const response = await apiFetch(
    `${API_BASE_URL}/fees/summary`
  );

  const result = await handleResponse(response);
  return result.summary;
}

export async function getStudentFees(): Promise<StudentFee[]> {
  const response = await apiFetch(`${API_BASE_URL}/fees`);

  const result = await handleResponse(response);
  return result.fees || [];
}

export async function createStudentFee(data: {
  student_id: number;
  semester: number;
  total_amount: number;
  due_date: string;
}): Promise<StudentFee> {
  const response = await apiFetch(`${API_BASE_URL}/fees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await handleResponse(response);
  return result.fee;
}

export async function recordFeePayment(
  feeId: number,
  data: {
    amount: number;
    payment_method: string;
  }
): Promise<{
  payment: FeePayment;
  receipt: FeeReceipt;
}> {
  const response = await apiFetch(
    `${API_BASE_URL}/fees/${feeId}/payments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  return handleResponse(response);
}

export async function getFeePayments(
  feeId: number
): Promise<FeePayment[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/fees/${feeId}/payments`
  );

  const result = await handleResponse(response);
  return result.payments || [];
}

// ==========================================
// ADMINISTRATION TYPES
// ==========================================

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: "Admin" | "Faculty";
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AcademicYear {
  id: number;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface Programme {
  id: number;
  programme_code: string;
  programme_name: string;
  department: string;
  duration_years: number;
  total_semesters: number;
  is_active: boolean;
}

export interface CampusSettings {
  id: number;
  campus_name: string;
  campus_code: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  updated_at: string;
}

export interface AdminAuditLog {
  id: number;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ==========================================
// USER MANAGEMENT API
// ==========================================

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await apiFetch(`${API_BASE_URL}/admin/users`);
  const result = await handleResponse(response);
  return result.users || [];
}

export async function createAdminUser(data: {
  id: string;
  full_name: string;
  email: string;
  role: "Admin" | "Faculty";
  department?: string;
}): Promise<AdminUser> {
  const response = await apiFetch(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await handleResponse(response);
  return result.user;
}

export async function updateAdminUser(
  id: string,
  data: Partial<AdminUser>
): Promise<AdminUser> {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await handleResponse(response);
  return result.user;
}

export async function deleteAdminUser(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
  });

  await handleResponse(response);
}

// ==========================================
// ACADEMIC YEAR API
// ==========================================

export async function getAcademicYears(): Promise<AcademicYear[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/academic-years`
  );

  const result = await handleResponse(response);
  return result.academicYears || [];
}

export async function createAcademicYear(data: {
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}): Promise<AcademicYear> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/academic-years`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  const result = await handleResponse(response);
  return result.academicYear;
}

export async function updateAcademicYear(
  id: number,
  data: Partial<AcademicYear>
): Promise<AcademicYear> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/academic-years/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  const result = await handleResponse(response);
  return result.academicYear;
}

export async function deleteAcademicYear(id: number): Promise<void> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/academic-years/${id}`,
    { method: "DELETE" }
  );

  await handleResponse(response);
}

// ==========================================
// PROGRAMME API
// ==========================================

export async function getProgrammes(): Promise<Programme[]> {
  const response = await apiFetch(`${API_BASE_URL}/admin/programmes`);
  const result = await handleResponse(response);
  return result.programmes || [];
}

export async function createProgramme(data: {
  programme_code: string;
  programme_name: string;
  department: string;
  duration_years: number;
  total_semesters: number;
}): Promise<Programme> {
  const response = await apiFetch(`${API_BASE_URL}/admin/programmes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await handleResponse(response);
  return result.programme;
}

export async function updateProgramme(
  id: number,
  data: Partial<Programme>
): Promise<Programme> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/programmes/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  const result = await handleResponse(response);
  return result.programme;
}

export async function deleteProgramme(id: number): Promise<void> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/programmes/${id}`,
    { method: "DELETE" }
  );

  await handleResponse(response);
}

// ==========================================
// CAMPUS SETTINGS API
// ==========================================

export async function getCampusSettings(): Promise<CampusSettings[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/campus-settings`
  );

  const result = await handleResponse(response);
  return result.settings || [];
}

export async function createCampusSettings(data: {
  campus_name: string;
  campus_code?: string;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
}): Promise<CampusSettings> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/campus-settings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  const result = await handleResponse(response);
  return result.settings;
}

export async function updateCampusSettings(
  id: number,
  data: Partial<CampusSettings>
): Promise<CampusSettings> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/campus-settings/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  const result = await handleResponse(response);
  return result.settings;
}

// ==========================================
// AUDIT LOG API
// ==========================================

export async function getAdminAuditLogs(
  limit = 100
): Promise<AdminAuditLog[]> {
  const response = await apiFetch(
    `${API_BASE_URL}/admin/audit-logs?limit=${limit}`
  );

  const result = await handleResponse(response);
  return result.logs || [];
}