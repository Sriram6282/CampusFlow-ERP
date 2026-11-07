import { db } from "./attendanceDB";

import Login from "./Login";
import { supabase } from "./supabase";

import type { LocalAttendanceStatus } from "./attendanceDB";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";


import { useEffect, useMemo, useState } from "react";

import type { FormEvent } from "react";

import {

  LayoutDashboard,

  Users,

  ClipboardCheck,

  GraduationCap,

  Wallet,

  BrainCircuit,

  Settings,

  Search,

  Bell,

  ChevronDown,

  TrendingUp,

  TrendingDown,

  Menu,

  X,

  AlertTriangle,

  ArrowUpRight,

  Plus,

  Pencil,

  Trash2,

  Download,

  CalendarDays,

  CheckCircle2,

  Clock3,

  BookOpen,

} from "lucide-react";

import "./App.css";
import CampusToolsPage from "./CampusToolsPage";

import {

  getStudents,

  createStudent,

  updateStudent,

  deleteStudent as deleteStudentApi,

  getAttendance,

  markAttendance,

} from "./api";

import type { AttendanceStatus } from "./api";
import {
  getAssessments,
  createAssessment,
  getAssessmentMarks,
  saveStudentMark,
  lockAssessment,
} from "./api";
import type { Assessment, StudentMark } from "./api";

import { getFeeSummary, getStudentFees, createStudentFee, recordFeePayment, getFeePayments } from "./api";
import type { StudentFee, FeeSummary, FeePayment } from "./api";
import {
  getAdminUsers,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getProgrammes,
  createProgramme,
  deleteProgramme,
  getCampusSettings,
  createCampusSettings,
  updateCampusSettings,
  getAdminAuditLogs,
} from "./api";
import type {
  AdminUser,
  AcademicYear,
  Programme,
  CampusSettings,
  AdminAuditLog,
} from "./api";



type Student = {

  dbId: number;

  id: string;

  name: string;

  programme: string;

  attendance: number;

  marks: number;

  status: "Good" | "Monitor" | "At Risk";

  email: string;

};



type AttendanceSelection = AttendanceStatus | "Not Marked";



const navigation = [

  { name: "Dashboard", icon: LayoutDashboard },

  { name: "Students", icon: Users },

  { name: "Attendance", icon: ClipboardCheck },

  { name: "Internal Marks", icon: GraduationCap },

  { name: "Fee Management", icon: Wallet },

  { name: "AI Risk Analysis", icon: BrainCircuit },

  { name: "Administration", icon: Settings },

];



function getRiskStatus(attendance: number, marks: number): Student["status"] {

  if (attendance < 70 || marks < 50) return "At Risk";

  if (attendance < 80 || marks < 65) return "Monitor";

  return "Good";

}



function getToday(): string {

  return new Date().toISOString().slice(0, 10);

}



function App() {

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setIsAuthenticated(!!data.session);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setIsAuthenticated(!!session);
  });

  

  return () => subscription.unsubscribe();
}, []);

  const [activePage, setActivePage] = useState("Dashboard");

  const [students, setStudents] = useState<Student[]>([]);

  const [loadingStudents, setLoadingStudents] = useState(true);

  const [studentError, setStudentError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);



  // Load student records from the Express API, which reads from Supabase.

  useEffect(() => {

    if (isAuthenticated !== true) {
      setStudents([]);
      setLoadingStudents(isAuthenticated === null);
      return;
    }

    let isMounted = true;



    async function loadStudents() {

      try {

        const data = await getStudents();



        if (isMounted) {

          setStudents(data);

          setStudentError("");

        }

      } catch (error) {

        console.error("Student loading error:", error);



        if (isMounted) {

          setStudentError(

            "Unable to load students from the backend. Check that the server is running and try again."

          );

        }

      } finally {

        if (isMounted) setLoadingStudents(false);

      }

    }



    loadStudents();



    return () => {

      isMounted = false;

    };

  }, [isAuthenticated]);

  if (isAuthenticated === null) {
    return (
      <div className="app-shell">
        <section className="panel placeholder-panel">
          <h3>Checking your session...</h3>
          <p>Please wait while CampusFlow verifies your login.</p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />
  }

  const pageTitle = activePage;



  function renderPage() {

    if (loadingStudents) {

      return (

        <section className="panel placeholder-panel">

          <h3>Loading students...</h3>

          <p>Connecting to the CampusFlow backend.</p>

        </section>

      );

    }



    if (studentError) {

      return (

        <section className="panel placeholder-panel">

          <h3>Could not load student data</h3>

          <p className="form-error">{studentError}</p>

          <button

            className="primary-button"

            onClick={() => window.location.reload()}

          >

            Retry

          </button>

        </section>

      );

    }



    switch (activePage) {

      case "Dashboard":

        return <DashboardPage
        students={students}
        setActivePage={setActivePage}
      />



      case "Students":

        return (

          <StudentsPage

            students={students}

            setStudents={setStudents}

          />

        );



      case "Attendance":

        return <AttendancePage students={students} />;



      case "Internal Marks":
        return <InternalMarksModule students={students} />;



      case "Fee Management":
        return <FeeManagementPage students={students} />;



      case "AI Risk Analysis":

        return <RiskPage students={students} />;



      case "Campus Insights":
        return <CampusToolsPage students={students} />;

      case "Administration":
        return <AdministrationModule />;



      default:

        return <DashboardPage
        students={students}
        setActivePage={setActivePage}
      />

    }

  }



  return (

    <div className="app-shell">

      {sidebarOpen && (

        <button

          className="mobile-overlay"

          aria-label="Close navigation"

          onClick={() => setSidebarOpen(false)}

        />

      )}



      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>

        <div className="brand">

          <div className="brand-mark">

            <GraduationCap size={23} />

          </div>



          <div>

            <h2>CampusFlow</h2>

            <span>ERP PLATFORM</span>

          </div>



          <button

            className="sidebar-close"

            onClick={() => setSidebarOpen(false)}

            aria-label="Close menu"

          >

            <X size={19} />

          </button>

        </div>



        <div className="campus-selector">

          <div className="campus-icon">

            <BookOpen size={17} />

          </div>



          <div className="campus-copy">

            <strong>Main Campus</strong>

            <span>Academic year 2026–27</span>

          </div>



          <ChevronDown size={15} />

        </div>



        <p className="nav-label">WORKSPACE</p>



        <nav className="side-nav">

          {navigation.map((item) => {

            const Icon = item.icon;



            return (

              <button

                key={item.name}

                className={`nav-item ${

                  activePage === item.name ? "active" : ""

                }`}

                onClick={() => {

                  setActivePage(item.name);

                  setSidebarOpen(false);

                }}

              >

                <Icon size={18} />

                <span>{item.name}</span>


                {item.name === "AI Risk Analysis" && (
  <span className="nav-count">
    {students.filter((student) => student.status === "At Risk").length}
  </span>
)}

              </button>

            );

          })}

        </nav>



        <div className="sidebar-bottom">

          <div className="help-card">

            <div className="help-icon">

              <BrainCircuit size={18} />

            </div>



            <strong>Need assistance?</strong>

            <p>Visit the CampusFlow help centre.</p>



            <button onClick={() => alert("Help centre is a demo feature.")}>

              Open help centre <ArrowUpRight size={13} />

            </button>

          </div>



          <div className="profile">

            <div className="avatar">AD</div>



            <div className="profile-copy">

              <strong>Admin User</strong>

              <span>Campus Administrator</span>

            </div>



            <ChevronDown size={15} />

          </div>

        </div>

      </aside>



      <main className="main-area">

        <header className="topbar">

          <div className="topbar-left">

            <button

              className="mobile-menu"

              onClick={() => setSidebarOpen(true)}

              aria-label="Open menu"

            >

              <Menu size={21} />

            </button>



            <div className="breadcrumb">

              Workspace <span>/</span> <strong>{pageTitle}</strong>

            </div>

          </div>



          <div className="topbar-right">

            <span className="environment-label">

              <span /> Demo environment

            </span>



            <button

              className="icon-button notification-button"

              aria-label="Notifications"

              onClick={() => alert("No new notifications.")}

            >

              <Bell size={19} />

              <i />

            </button>



            <div className="topbar-user">

              <div className="avatar small-avatar">AD</div>

              <ChevronDown size={14} />

            </div>

          </div>

        </header>



        <div className="page-container">

          {renderPage()}



          <footer className="footer">

            <span>CampusFlow ERP</span>

            <span>Demo environment · Sample data</span>

          </footer>

        </div>

      </main>

    </div>

  );

}



function PageHeading({

  eyebrow,

  title,

  description,

  action,

}: {

  eyebrow: string;

  title: string;

  description: string;

  action?: React.ReactNode;

}) {

  return (

    <div className="page-heading">

      <div>

        <p className="eyebrow">{eyebrow}</p>

        <h1>{title}</h1>

        <p className="page-description">{description}</p>

      </div>



      {action}

    </div>

  );

}



function StatCard({

  title,

  value,

  change,

  detail,

  icon,

  tone = "teal",

  trend = "up",

}: {

  title: string;

  value: string;

  change: string;

  detail: string;

  icon: React.ReactNode;

  tone?: string;

  trend?: "up" | "down" | "neutral";

}) {

  return (

    <div className="stat-card">

      <div className="stat-top">

        <span>{title}</span>

        <div className={`stat-icon ${tone}`}>{icon}</div>

      </div>



      <h2>{value}</h2>



      <div className="stat-bottom">

        <span className={`stat-change ${trend}`}>

        {trend === "up" ? (
  <TrendingUp size={13} />
) : trend === "down" ? (
  <TrendingDown size={13} />
) : null}

          {change}

        </span>



        <span>{detail}</span>

      </div>

    </div>

  );

}



function DashboardPage({
  students,
  setActivePage,
}: {
  students: Student[];
  setActivePage: (page: string) => void;
}) {

  const atRisk = students.filter(

    (student) => student.status === "At Risk"

  ).length;



  const averageAttendance = students.length

    ? students.reduce(

        (sum, student) => sum + student.attendance,

        0

      ) / students.length

    : 0;

    const performanceData = [
  {
    name: "Good",
    value: students.filter((s) => s.status === "Good").length,
    color: "#10b981",
  },
  {
    name: "Monitor",
    value: students.filter((s) => s.status === "Monitor").length,
    color: "#f59e0b",
  },
  {
    name: "At Risk",
    value: students.filter((s) => s.status === "At Risk").length,
    color: "#ef4444",
  },
];

const attendanceData = [
  {
    name: "Below 60%",
    students: students.filter((s) => s.attendance < 60).length,
  },
  {
    name: "60–74%",
    students: students.filter(
      (s) => s.attendance >= 60 && s.attendance < 75
    ).length,
  },
  {
    name: "75–89%",
    students: students.filter(
      (s) => s.attendance >= 75 && s.attendance < 90
    ).length,
  },
  {
    name: "90–100%",
    students: students.filter((s) => s.attendance >= 90).length,
  },
];

  return (

    <>

      <PageHeading

        eyebrow="OVERVIEW"

        title="Good morning, Admin"

        description="Here's what's happening across your campus today."

        action={

          <button

            className="secondary-button"

            onClick={() => window.print()}

          >

            <Download size={15} /> Export overview

          </button>

        }

      />
      



      <div className="welcome-strip">

        <div className="welcome-symbol">

          <GraduationCap size={24} />

        </div>



        <div>

          <strong>Welcome to your campus overview</strong>

          <p>

            Monitor academic performance, attendance and student engagement

            in one place.

          </p>

        </div>



        <span className="welcome-date">

          <CalendarDays size={14} /> Academic year 2026–27

        </span>

      </div>



      <div className="stats-grid">

      <StatCard

  title="Total students"
  value={students.length.toLocaleString("en-IN")}
  change="Live data"
  detail="registered student records"
  icon={<Users size={19} />}
  tone="blue"
  trend="neutral"
/>



        <StatCard

          title="Average attendance"

          value={`${averageAttendance.toFixed(1)}%`}

          change="+2.1%"

          detail="vs. previous month"

          icon={<ClipboardCheck size={19} />}

          tone="teal"

        />



        <StatCard

          title="Outstanding fees"

          value="₹45,000"

          change="8.2%"

          detail="of demo fee records"

          icon={<Wallet size={19} />}

          tone="orange"

          trend="down"

        />



        <StatCard

          title="At-risk students"

          value="124"

          change={`${atRisk} in sample`}

          detail="sample records flagged"

          icon={<AlertTriangle size={19} />}

          tone="red"

          trend="down"

        />

      </div>



      <div className="dashboard-grid">

      <section className="panel student-overview">
  <div className="panel-heading">
    <div>
      <h3>Student Overview</h3>
      <p>Recent student records and academic performance</p>
    </div>
    <span className="subtle-tag">B.Tech CSE</span>
  </div>

  <div className="table-wrap">
    <table>
      <thead>
        <tr>
          <th>STUDENT</th>
          <th>ATTENDANCE</th>
          <th>MARKS</th>
          <th>STATUS</th>
        </tr>
      </thead>

      <tbody>
        {students.slice(0, 5).map((student) => (
          <tr key={student.id}>
            <td>
              <div className="student-cell">
                <div className="student-avatar">
                  {student.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>

                <div>
                  <strong>{student.name}</strong>
                  <small>{student.id}</small>
                </div>
              </div>
            </td>

            <td>
              <strong>{student.attendance}%</strong>
            </td>

            <td>
              <strong>{student.marks}</strong>
              <span className="marks-total"> / 100</span>
            </td>

            <td>
              <StatusBadge status={student.status} />
            </td>
          </tr>
        ))}

        {students.length === 0 && (
          <tr>
            <td colSpan={4} className="empty-cell">
              No student records yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  
</section>
        
<section className="panel insights-panel">
  <div className="panel-heading">
    <div>
      <h3>AI Risk Insights</h3>
      <p>Student performance and attendance indicators</p>
    </div>
    <BrainCircuit size={22} className="teal-text" />
  </div>

  <div className="insight-highlight">
    <div className="insight-alert">
      <AlertTriangle size={20} />
    </div>

    <div>
      <strong>
        {students.filter((s) => s.status === "At Risk").length} students at risk
      </strong>
      <p>Students requiring additional academic attention.</p>
    </div>
  </div>

  <div className="insight-item">
    <span className="insight-dot orange-dot" />
    <div>
      <strong>Attendance needs attention</strong>
      <p>Review students with attendance below 75%.</p>
    </div>
  </div>

  <div className="insight-item">
    <span className="insight-dot green-dot" />
    <div>
      <strong>Academic performance</strong>
      <p>Monitor internal marks and identify improvement areas.</p>
    </div>
  </div>

  <div className="insight-item">
    <span className="insight-dot purple-dot" />
    <div>
      <strong>Early intervention</strong>
      <p>Provide timely support to students who need assistance.</p>
    </div>
  </div>

  <p className="disclaimer">
    Demo indicators based on sample student data. They are not predictions
    of actual student outcomes.
  </p>
</section>

      </div>

      <div className="charts-grid">

  {/* Student Performance Distribution */}
  <section className="panel chart-panel">
    <div className="panel-heading">
      <div>
        <h3>Student Performance Distribution</h3>
        <p>Breakdown by academic status</p>
      </div>
    </div>

    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={performanceData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={100}
            paddingAngle={4}
          >
            {performanceData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </section>

  {/* Attendance Overview */}
  <section className="panel chart-panel">
    <div className="panel-heading">
      <div>
        <h3>Attendance Overview</h3>
        <p>Students grouped by attendance percentage</p>
      </div>
    </div>

    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={attendanceData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar
            dataKey="students"
            fill="#159b8b"
            radius={[6, 6, 0, 0]}
            barSize={38}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>

</div>

      



      <section className="panel activity-panel">

        <div className="panel-heading">

          <div>

            <h3>Quick actions</h3>

            <p>Common academic operations</p>

          </div>

        </div>



        <div className="quick-actions">
  <button
    type="button"
    onClick={() => setActivePage("Students")}
  >
    <span className="quick-icon blue">
      <Users size={18} />
    </span>
    <strong>Student records</strong>
    <p>Manage student profiles</p>
  </button>

  <button
    type="button"
    onClick={() => setActivePage("Attendance")}
  >
    <span className="quick-icon teal">
      <ClipboardCheck size={18} />
    </span>
    <strong>Attendance</strong>
    <p>Record daily attendance</p>
  </button>

  <button
    type="button"
    onClick={() => setActivePage("Internal Marks")}
  >
    <span className="quick-icon purple">
      <GraduationCap size={18} />
    </span>
    <strong>Internal marks</strong>
    <p>Review assessment marks</p>
  </button>

  <button
    type="button"
    onClick={() => setActivePage("Fee Management")}
  >
    <span className="quick-icon orange">
      <Wallet size={18} />
    </span>
    <strong>Fee records</strong>
    <p>Review fee information</p>
  </button>
</div>

      </section>

    </>

  );

}



function StatusBadge({ status }: { status: Student["status"] }) {

  return (

    <span

      className={`status-badge ${status.toLowerCase().replace(" ", "-")}`}

    >

      <i />

      {status}

    </span>

  );

}



function StudentsPage({

  students,

  setStudents,

}: {

  students: Student[];

  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;

}) {

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [formError, setFormError] = useState("");



  const [form, setForm] = useState({

    id: "",

    name: "",

    programme: "B.Tech CSE",

    attendance: "80",

    marks: "70",

    email: "",

  });



  const filteredStudents = useMemo(

    () =>

      students.filter((student) => {

        const term = search.toLowerCase();



        return (

          student.name.toLowerCase().includes(term) ||

          student.id.toLowerCase().includes(term) ||

          student.email.toLowerCase().includes(term)

        );

      }),

    [students, search]

  );



  function openAddForm() {

    setEditingId(null);

    setForm({

      id: "",

      name: "",

      programme: "B.Tech CSE",

      attendance: "80",

      marks: "70",

      email: "",

    });

    setFormError("");

    setShowForm(true);

  }



  function openEditForm(student: Student) {

    setEditingId(student.id);



    setForm({

      id: student.id,

      name: student.name,

      programme: student.programme,

      attendance: String(student.attendance),

      marks: String(student.marks),

      email: student.email,

    });



    setFormError("");

    setShowForm(true);

  }



  async function submitStudent(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();



    const attendance = Number(form.attendance);

    const marks = Number(form.marks);

    const id = form.id.trim();



    if (!id || !form.name.trim()) {

      setFormError("Student ID and name are required.");

      return;

    }



    if (

      !Number.isFinite(attendance) ||

      attendance < 0 ||

      attendance > 100 ||

      !Number.isFinite(marks) ||

      marks < 0 ||

      marks > 100

    ) {

      setFormError("Attendance and marks must be between 0 and 100.");

      return;

    }



    if (

      students.some(

        (student) =>

          student.id.toLowerCase() === id.toLowerCase() &&

          student.id !== editingId

      )

    ) {

      setFormError("A student with this ID already exists.");

      return;

    }



    const updatedStudent = {

      id,

      name: form.name.trim(),

      programme: form.programme,

      attendance,

      marks,

      status: getRiskStatus(attendance, marks),

      email: form.email.trim(),

    };



    try {

      setFormError("");



      if (editingId) {

        const existingStudent = students.find(

          (student) => student.id === editingId

        );



        if (!existingStudent) {

          throw new Error(

            "Student record was not found. Refresh and try again."

          );

        }



        const studentPayload = {

          roll_number: updatedStudent.id,

          full_name: updatedStudent.name,

          email: updatedStudent.email,

          programme: updatedStudent.programme,

          attendance: updatedStudent.attendance,

          internal_marks: updatedStudent.marks,

        };



        const result = await updateStudent(

          existingStudent.dbId,

          studentPayload

        );



        setStudents((current) =>

          current.map((student) =>

            student.id === editingId ? result : student

          )

        );

      } else {

        const studentPayload = {

          roll_number: updatedStudent.id,

          full_name: updatedStudent.name,

          email: updatedStudent.email,

          programme: updatedStudent.programme,

          attendance: updatedStudent.attendance,

          internal_marks: updatedStudent.marks,

        };



        const createdStudent = await createStudent(studentPayload);



        setStudents((current) => [createdStudent, ...current]);

      }



      setShowForm(false);

      setEditingId(null);

    } catch (error) {

      setFormError(

        error instanceof Error

          ? error.message

          : "Unable to save student. Please try again."

      );

    }

  }



  async function deleteStudent(student: Student) {

    if (

      !window.confirm(

        `Delete ${student.name} (${student.id})? This cannot be undone.`

      )

    ) {

      return;

    }



    try {

      await deleteStudentApi(student.dbId);



      setStudents((current) =>

        current.filter((item) => item.dbId !== student.dbId)

      );

    } catch (error) {

      window.alert(

        error instanceof Error

          ? error.message

          : "Unable to delete student."

      );

    }

  }



  return (

    <>

      <PageHeading

        eyebrow="ACADEMIC RECORDS"

        title="Student Management"

        description="Create, update and manage student profiles for your campus."

        action={

          <button className="primary-button" onClick={openAddForm}>

            <Plus size={16} /> Add student

          </button>

        }

      />



      <div className="student-summary-row">

        <div className="mini-summary">

          <span>Total records</span>

          <strong>{students.length}</strong>

        </div>



        <div className="mini-summary">

          <span>Good standing</span>

          <strong>

            {students.filter((s) => s.status === "Good").length}

          </strong>

        </div>



        <div className="mini-summary">

          <span>Need attention</span>

          <strong>

            {students.filter((s) => s.status !== "Good").length}

          </strong>

        </div>

      </div>



      <section className="panel records-panel">

        <div className="records-toolbar">

          <div>

            <h3>All students</h3>

            <p>Search and manage student records</p>

          </div>



          <div className="search-box">

            <Search size={16} />

            <input

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder="Search by name, ID or email..."

            />

          </div>

        </div>



        <div className="table-wrap">

          <table>

            <thead>

              <tr>

                <th>STUDENT</th>

                <th>PROGRAMME</th>

                <th>ATTENDANCE</th>

                <th>MARKS</th>

                <th>STATUS</th>

                <th>ACTIONS</th>

              </tr>

            </thead>



            <tbody>

              {filteredStudents.map((student) => (

                <tr key={student.id}>

                  <td>

                    <div className="student-cell">

                      <div className="student-avatar">

                        {student.name

                          .split(" ")

                          .map((part) => part[0])

                          .slice(0, 2)

                          .join("")}

                      </div>



                      <div>

                        <strong>{student.name}</strong>

                        <small>{student.id}</small>

                      </div>

                    </div>

                  </td>



                  <td>{student.programme}</td>



                  <td>

                    <div className="percentage-cell">

                      <span>{student.attendance}%</span>

                      <div className="progress-track">

                        <i style={{ width: `${student.attendance}%` }} />

                      </div>

                    </div>

                  </td>



                  <td>{student.marks}/100</td>



                  <td>

                    <StatusBadge status={student.status} />

                  </td>



                  <td>

                    <div className="row-actions">

                      <button

                        aria-label="Edit student"

                        onClick={() => openEditForm(student)}

                      >

                        <Pencil size={15} />

                      </button>



                      <button

                        className="delete-action"

                        aria-label="Delete student"

                        onClick={() => deleteStudent(student)}

                      >

                        <Trash2 size={15} />

                      </button>

                    </div>

                  </td>

                </tr>

              ))}



              {filteredStudents.length === 0 && (

                <tr>

                  <td colSpan={6} className="empty-cell">

                    No matching students found.

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>



        <div className="table-bottom">

          <span>

            Showing {filteredStudents.length} of {students.length} student

            records

          </span>

          <span>Sample campus data</span>

        </div>

      </section>



      {showForm && (

        <div

          className="modal-backdrop"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {

              setShowForm(false);

            }

          }}

        >

          <div className="student-modal">

            <div className="modal-heading">

              <div>

                <h2>{editingId ? "Edit student" : "Add new student"}</h2>

                <p>Enter the student's academic and contact details.</p>

              </div>



              <button

                onClick={() => setShowForm(false)}

                aria-label="Close"

              >

                <X size={19} />

              </button>

            </div>



            <form onSubmit={submitStudent}>

              <div className="form-grid">

                <label>

                  Student ID

                  <input

                    value={form.id}

                    onChange={(e) =>

                      setForm({ ...form, id: e.target.value })

                    }

                    placeholder="e.g. CSE-2024-0301"

                    required

                  />

                </label>



                <label>

                  Full name

                  <input

                    value={form.name}

                    onChange={(e) =>

                      setForm({ ...form, name: e.target.value })

                    }

                    placeholder="Enter full name"

                    required

                  />

                </label>



                <label>

                  Programme

                  <select

                    value={form.programme}

                    onChange={(e) =>

                      setForm({ ...form, programme: e.target.value })

                    }

                  >

                    <option>B.Tech CSE</option>

                    <option>B.Tech ECE</option>

                    <option>B.Tech EEE</option>

                    <option>B.Tech Mechanical</option>

                  </select>

                </label>



                <label>

                  Email address

                  <input

                    type="email"

                    value={form.email}

                    onChange={(e) =>

                      setForm({ ...form, email: e.target.value })

                    }

                    placeholder="student@example.edu"

                  />

                </label>



                <label>

                  Attendance (%)

                  <input

                    type="number"

                    min="0"

                    max="100"

                    step="0.1"

                    value={form.attendance}

                    onChange={(e) =>

                      setForm({ ...form, attendance: e.target.value })

                    }

                    required

                  />

                </label>



                <label>

                  Internal marks (out of 100)

                  <input

                    type="number"

                    min="0"

                    max="100"

                    value={form.marks}

                    onChange={(e) =>

                      setForm({ ...form, marks: e.target.value })

                    }

                    required

                  />

                </label>

              </div>



              {formError && <p className="form-error">{formError}</p>}



              <div className="modal-actions">

                <button

                  type="button"

                  className="secondary-button"

                  onClick={() => setShowForm(false)}

                >

                  Cancel

                </button>



                <button type="submit" className="primary-button">

                  {editingId ? "Save changes" : "Add student"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>

  );

}



function AttendancePage({ students }: { students: Student[] }) {

  const [attendanceDate, setAttendanceDate] = useState(getToday);

  const [subject, setSubject] = useState("Data Structures");

  const [semester, setSemester] = useState(4);

  const [attendance, setAttendance] = useState<

    Record<string, AttendanceSelection>

  >({});

  const [saved, setSaved] = useState(false);

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);



  // Store one local record per student, date and subject.

  async function saveLocalRecord(

    studentId: number,

    status: LocalAttendanceStatus,

    syncStatus: "pending" | "synced" | "failed"

  ) {

    const record = {

      student_id: studentId,

      attendance_date: attendanceDate,

      subject,

      semester,

      status,

      syncStatus,

      updatedAt: new Date().toISOString(),

    };



    const existing = await db.attendance

      .where("[student_id+attendance_date+subject]")

      .equals([studentId, attendanceDate, subject])

      .first();



    if (existing?.id !== undefined) {

      await db.attendance.update(existing.id, record);

    } else {

      await db.attendance.add(record);

    }

  }



  // Retry every record in the local queue. A queue item is removed only

  // after the backend confirms that the record was saved.

  async function syncPendingAttendance(): Promise<number> {

    if (!navigator.onLine) return 0;



    const queuedRecords = await db.syncQueue.toArray();

    let syncedCount = 0;



    for (const queued of queuedRecords) {

      if (queued.id === undefined) continue;



      try {

        await markAttendance({

          student_id: queued.student_id,

          attendance_date: queued.attendance_date,

          subject: queued.subject,

          semester: queued.semester,

          status: queued.status,

        });



        const localRecord = await db.attendance

          .where("[student_id+attendance_date+subject]")

          .equals([

            queued.student_id,

            queued.attendance_date,

            queued.subject,

          ])

          .first();



        if (localRecord?.id !== undefined) {

          await db.attendance.update(localRecord.id, {

            syncStatus: "synced",

            updatedAt: new Date().toISOString(),

          });

        }



        await db.syncQueue.delete(queued.id);

        syncedCount += 1;

      } catch (error) {

        await db.syncQueue.update(queued.id, {

          attempts: queued.attempts + 1,

          lastError:

            error instanceof Error

              ? error.message

              : "Synchronization failed",

        });



        const localRecord = await db.attendance

          .where("[student_id+attendance_date+subject]")

          .equals([

            queued.student_id,

            queued.attendance_date,

            queued.subject,

          ])

          .first();



        if (localRecord?.id !== undefined) {

          await db.attendance.update(localRecord.id, {

            syncStatus: "failed",

            updatedAt: new Date().toISOString(),

          });

        }

      }

    }



    return syncedCount;

  }



  // Try syncing when the page opens and whenever connectivity returns.

  useEffect(() => {

    const handleOnline = () => {

      void syncPendingAttendance();

    };



    window.addEventListener("online", handleOnline);



    if (navigator.onLine) {

      void syncPendingAttendance();

    }



    return () => {

      window.removeEventListener("online", handleOnline);

    };

  }, []);



  // Load local records first, then refresh from the backend when online.

  useEffect(() => {

    let active = true;



    async function loadAttendance() {

      setLoading(true);

      setMessage("");



      try {

        const localRecords = await db.attendance

          .where("attendance_date")

          .equals(attendanceDate)

          .filter(

            (record) =>

              record.subject === subject &&

              record.semester === semester

          )

          .toArray();



        let serverRecords: Awaited<ReturnType<typeof getAttendance>> = [];



        if (navigator.onLine) {

          try {

            const allServerRecords = await getAttendance();



            serverRecords = allServerRecords.filter(

              (record) =>

                record.attendance_date === attendanceDate &&

                record.subject === subject &&

                record.semester === semester

            );

          } catch {

            // Use local records if the backend is temporarily unavailable.

          }

        }



        if (!active) return;



        const map: Record<string, AttendanceSelection> = {};



        // Start with the latest server records.

        serverRecords.forEach((record) => {

          map[String(record.student_id)] = record.status;

        });



        // Pending/failed local changes take priority over older server data.

        localRecords.forEach((record) => {

          if (

            record.syncStatus === "pending" ||

            record.syncStatus === "failed" ||

            !map[String(record.student_id)]

          ) {

            map[String(record.student_id)] = record.status;

          }

        });



        // Cache server records locally, but never overwrite pending local work.

        for (const record of serverRecords) {

          const existing = await db.attendance

            .where("[student_id+attendance_date+subject]")

            .equals([record.student_id, attendanceDate, subject])

            .first();



          if (

            existing?.id !== undefined &&

            (existing.syncStatus === "pending" ||

              existing.syncStatus === "failed")

          ) {

            continue;

          }



          await saveLocalRecord(

            record.student_id,

            record.status,

            "synced"

          );

        }



        setAttendance(map);

        setSaved(Object.keys(map).length > 0);



        if (!navigator.onLine) {

          setMessage(

            "Offline mode: showing attendance saved on this device."

          );

        } else if (serverRecords.length === 0 && localRecords.length > 0) {

          setMessage(

            "Showing locally saved attendance. Server records are not available."

          );

        }

      } catch (error) {

        if (!active) return;



        setAttendance({});

        setSaved(false);



        setMessage(

          error instanceof Error

            ? error.message

            : "Unable to load attendance records."

        );

      } finally {

        if (active) setLoading(false);

      }

    }



    void loadAttendance();



    return () => {

      active = false;

    };

  }, [attendanceDate, subject, semester]);



  const presentCount = Object.values(attendance).filter(

    (value) => value === "Present"

  ).length;



  const absentCount = Object.values(attendance).filter(

    (value) => value === "Absent"

  ).length;



  const unmarkedCount = students.length - presentCount - absentCount;



  function updateAttendance(

    studentId: number,

    status: AttendanceSelection

  ) {

    setAttendance((current) => ({

      ...current,

      [String(studentId)]: status,

    }));



    setSaved(false);

    setMessage("");

  }



  function markAll(status: AttendanceStatus) {

    const updated: Record<string, AttendanceSelection> = {};



    students.forEach((student) => {

      updated[String(student.dbId)] = status;

    });



    setAttendance(updated);

    setSaved(false);

    setMessage("");

  }



  async function saveAttendance() {

    if (unmarkedCount > 0) {

      setMessage(

        `Please mark attendance for all students. ${unmarkedCount} record(s) are still unmarked.`

      );

      return;

    }



    setSaving(true);

    setMessage("");



    try {

      // Save locally first, so attendance is not lost if the network fails.

      for (const student of students) {

        const status = attendance[String(student.dbId)];



        if (status !== "Present" && status !== "Absent") {

          throw new Error(`Attendance missing for ${student.name}`);

        }



        await saveLocalRecord(student.dbId, status, "pending");



        const existingQueue = await db.syncQueue

          .where("student_id")

          .equals(student.dbId)

          .filter(

            (record) =>

              record.attendance_date === attendanceDate &&

              record.subject === subject

          )

          .first();



        const queueRecord = {

          student_id: student.dbId,

          attendance_date: attendanceDate,

          subject,

          semester,

          status,

          createdAt: new Date().toISOString(),

          attempts: existingQueue?.attempts ?? 0,

        };



        if (existingQueue?.id !== undefined) {

          await db.syncQueue.update(existingQueue.id, queueRecord);

        } else {

          await db.syncQueue.add(queueRecord);

        }

      }



      setSaved(true);



      if (!navigator.onLine) {

        setMessage(

          "Attendance saved on this device. It will sync automatically when the internet connection returns."

        );

      } else {

        const syncedCount = await syncPendingAttendance();

        const remaining = await db.syncQueue.count();



        if (remaining === 0) {

          setMessage(

            "Attendance saved locally and synchronized with Supabase."

          );

        } else {

          setMessage(

            `${syncedCount} record(s) synchronized. ${remaining} record(s) remain in the sync queue and will be retried.`

          );

        }

      }

    } catch (error) {

      setSaved(false);



      setMessage(

        error instanceof Error

          ? `Attendance was not fully saved: ${error.message}`

          : "Unable to save attendance."

      );

    } finally {

      setSaving(false);

    }

  }



  return (

    <>

      <PageHeading

        eyebrow="ACADEMIC OPERATIONS"

        title="Attendance Management"

        description="Record and review daily student attendance."

      />



      <div className="attendance-summary-cards">

        <div className="attendance-stat">

          <span className="attendance-stat-icon present-icon">

            <CheckCircle2 size={18} />

          </span>

          <div>

            <small>Present</small>

            <strong>{presentCount}</strong>

          </div>

        </div>



        <div className="attendance-stat">

          <span className="attendance-stat-icon absent-icon">

            <X size={18} />

          </span>

          <div>

            <small>Absent</small>

            <strong>{absentCount}</strong>

          </div>

        </div>



        <div className="attendance-stat">

          <span className="attendance-stat-icon pending-icon">

            <Clock3 size={18} />

          </span>

          <div>

            <small>Not marked</small>

            <strong>{unmarkedCount}</strong>

          </div>

        </div>



        <div className="attendance-stat">

          <span className="attendance-stat-icon total-icon">

            <Users size={18} />

          </span>

          <div>

            <small>Total students</small>

            <strong>{students.length}</strong>

          </div>

        </div>

      </div>



      <section className="panel attendance-panel">

        <div className="attendance-toolbar">

          <div>

            <h3>Daily attendance register</h3>

            <p>Select a date, subject and semester.</p>

          </div>



          <div className="date-input-group">

            <label htmlFor="attendance-date">ATTENDANCE DATE</label>

            <input

              id="attendance-date"

              type="date"

              value={attendanceDate}

              onChange={(event) =>

                setAttendanceDate(event.target.value)

              }

            />

          </div>

        </div>



        <div className="attendance-toolbar">

          <label>

            SUBJECT

            <select

              value={subject}

              onChange={(event) => setSubject(event.target.value)}

            >

              <option>Data Structures</option>

              <option>Database Management Systems</option>

              <option>Operating Systems</option>

              <option>Computer Networks</option>

              <option>Artificial Intelligence</option>

            </select>

          </label>



          <label>

            SEMESTER

            <select

              value={semester}

              onChange={(event) =>

                setSemester(Number(event.target.value))

              }

            >

              {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (

                <option key={value} value={value}>

                  Semester {value}

                </option>

              ))}

            </select>

          </label>

        </div>



        <div className="attendance-shortcuts">

          <button onClick={() => markAll("Present")}>

            Mark all present

          </button>



          <button onClick={() => markAll("Absent")}>

            Mark all absent

          </button>

        </div>



        {loading ? (

          <p>Loading attendance records...</p>

        ) : (

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>STUDENT</th>

                  <th>STUDENT ID</th>

                  <th>ATTENDANCE STATUS</th>

                </tr>

              </thead>



              <tbody>

                {students.map((student) => (

                  <tr key={student.dbId}>

                    <td>

                      <div className="student-cell">

                        <div className="student-avatar">

                          {student.name

                            .split(" ")

                            .map((part) => part[0])

                            .slice(0, 2)

                            .join("")}

                        </div>



                        <div>

                          <strong>{student.name}</strong>

                          <small>{student.programme}</small>

                        </div>

                      </div>

                    </td>



                    <td>{student.id}</td>



                    <td>

                      <select

                        className={`attendance-select ${String(

                          attendance[String(student.dbId)] || "Not Marked"

                        )

                          .toLowerCase()

                          .replace(" ", "-")}`}

                        value={

                          attendance[String(student.dbId)] || "Not Marked"

                        }

                        onChange={(event) =>

                          updateAttendance(

                            student.dbId,

                            event.target.value as AttendanceSelection

                          )

                        }

                      >

                        <option value="Not Marked">Not Marked</option>

                        <option value="Present">Present</option>

                        <option value="Absent">Absent</option>

                      </select>

                    </td>

                  </tr>

                ))}



                {students.length === 0 && (

                  <tr>

                    <td colSpan={3} className="empty-cell">

                      Add students before recording attendance.

                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        )}



        <div className="attendance-footer">

          <div className="attendance-save-status">

            {saved && (

              <span className="saved-label">

                <CheckCircle2 size={14} /> Saved for {attendanceDate}

              </span>

            )}



            {message && (

              <span

                className={saved ? "success-message" : "form-error"}

              >

                {message}

              </span>

            )}

          </div>



          <button

            className="primary-button save-attendance-button"

            onClick={saveAttendance}

            disabled={students.length === 0 || loading || saving}

          >

            <CheckCircle2 size={16} />

            {saving ? "Saving..." : "Save attendance"}

          </button>

        </div>

      </section>



      <p className="demo-note">

        <AlertTriangle size={14} />

        Attendance is stored locally first and synchronized with Supabase

        when a connection is available. Pending records remain queued if

        synchronization fails.

      </p>

    </>

  );

}



function RiskPage({ students }: { students: Student[] }) {

  const flagged = students.filter(

    (student) => student.status !== "Good"

  );



  return (

    <>

      <PageHeading

        eyebrow="STUDENT SUCCESS"

        title="AI Risk Analysis"

        description="Review transparent indicators that highlight students who may need academic support."

      />



      <div className="risk-explanation">

        <BrainCircuit size={22} />



        <div>

          <strong>How the demo risk indicator works</strong>

          <p>

            At Risk: attendance below 70% or marks below 50. Monitor:

            attendance below 80% or marks below 65. Good: neither condition

            applies.

          </p>

        </div>

      </div>



      <section className="panel records-panel">

        <div className="records-toolbar">

          <div>

            <h3>Students requiring review</h3>

            <p>

              {flagged.length} student(s) in the current sample records

            </p>

          </div>



          <span className="subtle-tag">Rule-based demo</span>

        </div>



        <div className="table-wrap">

          <table>

            <thead>

              <tr>

                <th>STUDENT</th>

                <th>ATTENDANCE</th>

                <th>MARKS</th>

                <th>INDICATOR</th>

                <th>REVIEW REASON</th>

              </tr>

            </thead>



            <tbody>

              {flagged.map((student) => (

                <tr key={student.id}>

                  <td>

                    <div className="student-cell">

                      <div className="student-avatar">

                        {student.name

                          .split(" ")

                          .map((part) => part[0])

                          .slice(0, 2)

                          .join("")}

                      </div>



                      <div>

                        <strong>{student.name}</strong>

                        <small>{student.id}</small>

                      </div>

                    </div>

                  </td>



                  <td>{student.attendance}%</td>

                  <td>{student.marks}/100</td>



                  <td>

                    <StatusBadge status={student.status} />

                  </td>



                  <td>

                    {student.attendance < 70

                      ? "Attendance below 70%"

                      : student.marks < 50

                        ? "Marks below 50"

                        : "Needs monitoring"}

                  </td>

                </tr>

              ))}



              {flagged.length === 0 && (

                <tr>

                  <td colSpan={5} className="empty-cell">

                    No students currently match the demo risk rules.

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>



      <p className="demo-note">

        <AlertTriangle size={14} />

        These are explainable demo rules, not a trained AI model or a final

        academic decision.

      </p>

    </>

  );

}


type MarksAuditEntry = {
  id: number;
  assessment_id: number;
  student_id: number;
  old_marks: number | null;
  new_marks: number;
  changed_at: string;
};

function InternalMarksModule({ students }: { students: Student[] }) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [audit, setAudit] = useState<MarksAuditEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Data Structures");
  const [semester, setSemester] = useState("4");
  const [maxMarks, setMaxMarks] = useState("30");
  const [assessmentDate, setAssessmentDate] = useState(getToday);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [locking, setLocking] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selected = assessments.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getAssessments();
        if (!active) return;
        setAssessments(data);
        setSelectedId((current) => current && data.some((item) => item.id === current)
          ? current : data[0]?.id ?? null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load assessments.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setMarks([]); setDrafts({}); setAudit([]); return;
    }
    let active = true;
    async function loadDetails() {
      setError("");
      try {
        const rows = await getAssessmentMarks(selectedId!);
        if (!active) return;
        setMarks(rows);
        const next: Record<number, string> = {};
        rows.forEach((row) => { next[row.student_id] = String(row.marks_obtained); });
        setDrafts(next);
        const response = await fetch(`http://localhost:4000/api/internals/assessments/${selectedId}/audit`);
        if (active && response.ok) {
          const result = await response.json();
          setAudit(result.audit || []);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load marks.");
      }
    }
    void loadDetails();
    return () => { active = false; };
  }, [selectedId]);

  async function refreshDetails(id: number) {
    const rows = await getAssessmentMarks(id);
    setMarks(rows);
    const next: Record<number, string> = {};
    rows.forEach((row) => { next[row.student_id] = String(row.marks_obtained); });
    setDrafts(next);
    const response = await fetch(`http://localhost:4000/api/internals/assessments/${id}/audit`);
    if (response.ok) {
      const result = await response.json();
      setAudit(result.audit || []);
    }
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const maximum = Number(maxMarks), term = Number(semester);
    if (!title.trim() || !subject.trim() || !Number.isFinite(maximum) || maximum <= 0 ||
        !Number.isInteger(term) || term < 1 || term > 8 || !assessmentDate) {
      setError("Enter a title, subject, valid semester, positive maximum marks and date."); return;
    }
    setCreating(true);
    try {
      const created = await createAssessment({ title: title.trim(), subject: subject.trim(),
        semester: term, max_marks: maximum, assessment_date: assessmentDate });
      setAssessments((current) => [created, ...current]);
      setSelectedId(created.id); setTitle(""); setMessage("Assessment created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create assessment.");
    } finally { setCreating(false); }
  }

  async function saveMark(studentId: number) {
    if (!selected || selected.is_locked) return;
    const raw = drafts[studentId];
    const value = Number(raw);
    if (raw === undefined || raw.trim() === "" || !Number.isFinite(value) ||
        value < 0 || value > Number(selected.max_marks)) {
      setError(`Enter a mark between 0 and ${selected.max_marks}.`); return;
    }
    setSavingId(studentId); setError(""); setMessage("");
    try {
      await saveStudentMark(selected.id, studentId, value);
      await refreshDetails(selected.id);
      setMessage("Student marks saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save marks.");
    } finally { setSavingId(null); }
  }

  async function lockSelected() {
    if (!selected || selected.is_locked) return;
    if (!window.confirm("Lock this assessment? Marks cannot be edited afterwards.")) return;
    setLocking(true); setError(""); setMessage("");
    try {
      const updated = await lockAssessment(selected.id);
      setAssessments((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessage("Assessment locked successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to lock assessment.");
    } finally { setLocking(false); }
  }

  const savedIds = new Set(marks.map((row) => row.student_id));
  const average = marks.length ? marks.reduce((sum, row) => sum + Number(row.marks_obtained), 0) / marks.length : 0;

  if (loading) return <><PageHeading eyebrow="ACADEMIC OPERATIONS" title="Internal Marks" description="Manage assessments and student marks." /><section className="panel"><p>Loading assessments...</p></section></>;

  return (
    <>
      <PageHeading eyebrow="ACADEMIC OPERATIONS" title="Internal Marks" description="Create assessments, enter student marks and review moderation status." />
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      <section className="panel">
        <div className="panel-heading"><div><h3>Create assessment</h3><p>Configure the subject, semester, date and maximum marks.</p></div></div>
        <form onSubmit={submitAssessment}>
          <div className="form-grid">
            <label>Assessment title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Internal Assessment 1" required /></label>
            <label>Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} required /></label>
            <label>Semester<select value={semester} onChange={(e) => setSemester(e.target.value)}>{[1,2,3,4,5,6,7,8].map((v) => <option key={v} value={v}>Semester {v}</option>)}</select></label>
            <label>Maximum marks<input type="number" min="0.01" step="0.01" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} required /></label>
            <label>Assessment date<input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} required /></label>
          </div>
          <div className="modal-actions"><button type="submit" className="primary-button" disabled={creating}>{creating ? "Creating..." : "Create assessment"}</button></div>
        </form>
      </section>

      <section className="panel records-panel">
        <div className="records-toolbar"><div><h3>Assessment records</h3><p>Select an assessment to manage student marks.</p></div><span className="subtle-tag">{assessments.length} assessments</span></div>
        {assessments.length === 0 ? <p className="empty-cell">No assessments created yet.</p> :
          <div className="table-wrap"><table><thead><tr><th>ASSESSMENT</th><th>SUBJECT</th><th>SEMESTER</th><th>MAXIMUM</th><th>DATE</th><th>STATUS</th><th>ACTION</th></tr></thead>
            <tbody>{assessments.map((item) => <tr key={item.id}><td>{item.title}</td><td>{item.subject}</td><td>{item.semester}</td><td>{item.max_marks}</td><td>{item.assessment_date}</td><td>{item.is_locked ? "Locked" : "Open"}</td><td><button type="button" className="secondary-button" onClick={() => { setSelectedId(item.id); setError(""); setMessage(""); }}>{selectedId === item.id ? "Selected" : "Manage"}</button></td></tr>)}</tbody>
          </table></div>}
      </section>

      {selected && <>
        <div className="attendance-summary-cards">
          <div className="attendance-stat"><div><small>Total students</small><strong>{students.length}</strong></div></div>
          <div className="attendance-stat"><div><small>Marks saved</small><strong>{savedIds.size}</strong></div></div>
          <div className="attendance-stat"><div><small>Pending entries</small><strong>{Math.max(0, students.length - savedIds.size)}</strong></div></div>
          <div className="attendance-stat"><div><small>Average marks</small><strong>{average.toFixed(2)}</strong></div></div>
        </div>
        <section className="panel records-panel">
          <div className="records-toolbar"><div><h3>{selected.title}</h3><p>{selected.subject} · Semester {selected.semester} · Maximum {selected.max_marks}</p></div><span className="subtle-tag">{selected.is_locked ? "Moderation locked" : "Open"}</span></div>
          <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>MARKS</th><th>MAXIMUM</th><th>STATUS</th><th>ACTION</th></tr></thead>
            <tbody>{students.map((student) => {
              const existing = marks.find((row) => row.student_id === student.dbId);
              return <tr key={student.dbId}><td><div className="student-cell"><div className="student-avatar">{student.name.split(" ").map((part) => part[0]).slice(0,2).join("")}</div><div><strong>{student.name}</strong><small>{student.programme}</small></div></div></td>
                <td>{student.id}</td><td><input type="number" min="0" max={Number(selected.max_marks)} step="0.01" value={drafts[student.dbId] ?? ""} placeholder="Enter marks" disabled={selected.is_locked} onChange={(e) => setDrafts((current) => ({...current, [student.dbId]: e.target.value}))} /></td>
                <td>{selected.max_marks}</td><td>{existing ? "Saved" : "Pending"}</td><td><button type="button" className="primary-button" disabled={selected.is_locked || savingId === student.dbId} onClick={() => void saveMark(student.dbId)}>{savingId === student.dbId ? "Saving..." : existing ? "Update" : "Save"}</button></td></tr>;
            })}{students.length === 0 && <tr><td colSpan={6} className="empty-cell">Add students before entering marks.</td></tr>}</tbody>
          </table></div>
          <div className="attendance-footer"><button type="button" className="secondary-button" onClick={() => setShowAudit((value) => !value)}>{showAudit ? "Hide audit history" : "View audit history"}</button><button type="button" className="primary-button" disabled={selected.is_locked || locking} onClick={() => void lockSelected()}>{locking ? "Locking..." : selected.is_locked ? "Assessment locked" : "Lock after moderation"}</button></div>
          {showAudit && <div className="panel"><h3>Marks audit history</h3>{audit.length === 0 ? <p className="empty-cell">No audit records found. The backend audit-history GET endpoint must be enabled.</p> :
            <div className="table-wrap"><table><thead><tr><th>STUDENT ID</th><th>PREVIOUS MARKS</th><th>NEW MARKS</th><th>CHANGED AT</th></tr></thead><tbody>{audit.map((entry) => <tr key={entry.id}><td>{entry.student_id}</td><td>{entry.old_marks === null ? "First entry" : entry.old_marks}</td><td>{entry.new_marks}</td><td>{new Date(entry.changed_at).toLocaleString()}</td></tr>)}</tbody></table></div>}</div>}
        </section>
      </>}
    </>
  );
}




function FeeManagementPage({ students }: { students: Student[] }) {
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [summary, setSummary] = useState<FeeSummary>({
    totalFees: 0, collected: 0, pending: 0, overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState("1");
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedFee, setSelectedFee] = useState<StudentFee | null>(null);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const money = (value: number) => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(Number(value) || 0);

  async function loadFees() {
    try {
      setLoading(true); setError("");
      const [feeRows, totals] = await Promise.all([getStudentFees(), getFeeSummary()]);
      setFees(feeRows); setSummary(totals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load fee records.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadFees(); }, []);

  async function handleCreateFee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(totalAmount);
    if (!studentId || !dueDate || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a student, valid fee amount and due date."); return;
    }
    try {
      setSaving(true); setError(""); setSuccess("");
      await createStudentFee({ student_id: Number(studentId), semester: Number(semester), total_amount: amount, due_date: dueDate });
      setSuccess("Student fee record created successfully.");
      setStudentId(""); setSemester("1"); setTotalAmount(""); setDueDate(""); setShowForm(false);
      await loadFees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create fee record.");
    } finally { setSaving(false); }
  }

  async function handlePayment(fee: StudentFee) {
    const balance = Number(fee.total_amount) - Number(fee.paid_amount);
    if (balance <= 0) return;
    const amountText = window.prompt(`Outstanding balance: ${money(balance)}\nEnter payment amount:`);
    if (amountText === null) return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      setError("Enter a valid amount not exceeding the outstanding balance."); return;
    }
    const methodText = window.prompt("Payment method: Cash, UPI, Card or Bank Transfer");
    if (!methodText) return;
    const methodMap: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", "bank transfer": "Bank Transfer" };
    const paymentMethod = methodMap[methodText.trim().toLowerCase()];
    if (!paymentMethod) { setError("Choose Cash, UPI, Card or Bank Transfer."); return; }
    try {
      setError(""); setSuccess("");
      const result = await recordFeePayment(fee.id, { amount, payment_method: paymentMethod });
      setSuccess(`Payment recorded. Reference: ${result.receipt.reference}`);
      window.alert(`DEMO PAYMENT RECEIPT\nReference: ${result.receipt.reference}\nAmount: ${money(result.receipt.amount)}\nMethod: ${result.receipt.payment_method}\nDate: ${result.receipt.payment_date}`);
      await loadFees();
    } catch (err) { setError(err instanceof Error ? err.message : "Payment failed."); }
  }

  async function openPaymentHistory(fee: StudentFee) {
    try {
      setError(""); const rows = await getFeePayments(fee.id);
      setSelectedFee(fee); setPayments(rows); setShowHistory(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load payment history."); }
  }

  const filteredFees = fees.filter((fee) => {
    const student = students.find((item) => item.dbId === fee.student_id);
    const name = fee.students?.full_name || student?.name || "";
    const roll = fee.students?.roll_number || student?.id || "";
    const q = search.toLowerCase();
    return name.toLowerCase().includes(q) || roll.toLowerCase().includes(q) || String(fee.semester).includes(q) || fee.status.toLowerCase().includes(q);
  });

  return (
    <>
      <PageHeading eyebrow="FINANCE MANAGEMENT" title="Fee Management" description="Manage student fee records, outstanding dues and mock payments." action={<button className="primary-button" onClick={() => { setShowForm((v) => !v); setError(""); }}><Plus size={15} />{showForm ? "Close Form" : "Create Fee Record"}</button>} />
      <div className="attendance-summary-cards">
        <div className="attendance-stat"><div className="attendance-stat-icon total-icon"><Wallet size={18} /></div><div><small>Total Fees</small><strong>{money(summary.totalFees)}</strong></div></div>
        <div className="attendance-stat"><div className="attendance-stat-icon present-icon"><CheckCircle2 size={18} /></div><div><small>Collected</small><strong>{money(summary.collected)}</strong></div></div>
        <div className="attendance-stat"><div className="attendance-stat-icon pending-icon"><Clock3 size={18} /></div><div><small>Pending</small><strong>{money(summary.pending)}</strong></div></div>
        <div className="attendance-stat"><div className="attendance-stat-icon absent-icon"><AlertTriangle size={18} /></div><div><small>Overdue</small><strong>{money(summary.overdue)}</strong></div></div>
      </div>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="success-message">{success}</p>}
      {showForm && <section className="panel attendance-panel fee-form-panel"><div className="panel-heading"><div><h3>Create Student Fee Record</h3><p>Assign semester fees to a registered student.</p></div></div>
        {students.length === 0 ? <p className="form-error">Add students before creating fee records.</p> :
          <form onSubmit={handleCreateFee}><div className="form-grid">
            <label>Student<select value={studentId} onChange={(e) => setStudentId(e.target.value)} required><option value="">Select a student</option>{students.map((s) => <option key={s.dbId} value={s.dbId}>{s.name} ({s.id})</option>)}</select></label>
            <label>Semester<select value={semester} onChange={(e) => setSemester(e.target.value)}>{Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={i + 1}>Semester {i + 1}</option>)}</select></label>
            <label>Total Fee Amount (₹)<input type="number" min="1" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="Enter total fee" required /></label>
            <label>Due Date<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></label>
          </div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving..." : "Create Fee Record"}</button></div></form>}
      </section>}
      <section className="panel records-panel"><div className="records-toolbar"><div><h3>Student Fee Records</h3><p>Track payments and outstanding balances.</p></div><div className="search-box"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, roll number or status..." /></div></div>
        {loading ? <p className="empty-cell">Loading fee records...</p> : <div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>SEMESTER</th><th>TOTAL FEE</th><th>PAID</th><th>BALANCE</th><th>DUE DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
          {filteredFees.map((fee) => {
            const student = students.find((s) => s.dbId === fee.student_id);
            const name = fee.students?.full_name || student?.name || "Unknown";
            const roll = fee.students?.roll_number || student?.id || "—";
            const balance = Number(fee.total_amount) - Number(fee.paid_amount);
            const statusClass = fee.status === "Paid" ? "good" : fee.status === "Overdue" ? "at-risk" : "monitor";
            return <tr key={fee.id}><td><div className="student-cell"><div className="student-avatar">{name.slice(0, 1).toUpperCase()}</div><div><strong>{name}</strong><small>{roll}</small></div></div></td><td>Semester {fee.semester}</td><td>{money(fee.total_amount)}</td><td>{money(fee.paid_amount)}</td><td><strong>{money(balance)}</strong></td><td>{new Date(`${fee.due_date}T00:00:00`).toLocaleDateString("en-IN")}</td><td><span className={`status-badge ${statusClass}`}><i />{fee.status}</span></td><td><div className="row-actions">{balance > 0 && <button title="Record payment" aria-label="Record payment" onClick={() => void handlePayment(fee)}><Wallet size={14} /></button>}<button title="Payment history" aria-label="Payment history" onClick={() => void openPaymentHistory(fee)}><Clock3 size={14} /></button></div></td></tr>;
          })}
          {filteredFees.length === 0 && <tr><td colSpan={8} className="empty-cell">{search ? "No matching fee records found." : "No fee records available. Create your first fee record."}</td></tr>}
        </tbody></table></div>}
        <div className="table-bottom"><span>{filteredFees.length} fee record(s)</span><button className="secondary-button" onClick={() => void loadFees()} disabled={loading}>Refresh Records</button></div>
      </section>
      {showHistory && selectedFee && <div className="modal-backdrop"><section className="student-modal"><div className="modal-heading"><div><h2>Payment History</h2><p>{selectedFee.students?.full_name || students.find((s) => s.dbId === selectedFee.student_id)?.name || "Student"} · Semester {selectedFee.semester}</p></div><button onClick={() => setShowHistory(false)} aria-label="Close payment history"><X size={19} /></button></div>
        <div className="table-wrap"><table><thead><tr><th>DATE</th><th>AMOUNT</th><th>METHOD</th><th>REFERENCE</th></tr></thead><tbody>{payments.map((p) => <tr key={p.id}><td>{new Date(p.payment_date).toLocaleDateString("en-IN")}</td><td>{money(p.amount)}</td><td>{p.payment_method}</td><td>{p.transaction_reference}</td></tr>)}{payments.length === 0 && <tr><td colSpan={4} className="empty-cell">No payments recorded yet.</td></tr>}</tbody></table></div>
        <div className="modal-actions"><button className="secondary-button" onClick={() => setShowHistory(false)}>Close</button></div></section></div>}
      <p className="demo-note"><AlertTriangle size={14} />Payments are simulated for this assessment. No real money is collected or transferred.</p>
    </>
  );
}


function AdministrationModule() {
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [campuses, setCampuses] = useState<CampusSettings[]>([]);
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [yearName, setYearName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  const [programmeCode, setProgrammeCode] = useState("");
  const [programmeName, setProgrammeName] = useState("");
  const [department, setDepartment] = useState("");
  const [duration, setDuration] = useState("4");

  const [campusName, setCampusName] = useState("");
  const [campusCode, setCampusCode] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [campusEmail, setCampusEmail] = useState("");
  const [campusPhone, setCampusPhone] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [u, y, p, c, l] = await Promise.all([
        getAdminUsers(),
        getAcademicYears(),
        getProgrammes(),
        getCampusSettings(),
        getAdminAuditLogs(),
      ]);
      setUsers(u);
      setYears(y);
      setProgrammes(p);
      setCampuses(c);
      setLogs(l);
      if (c.length > 0) {
        setCampusName(c[0].campus_name || "");
        setCampusCode(c[0].campus_code || "");
        setCampusAddress(c[0].address || "");
        setCampusEmail(c[0].contact_email || "");
        setCampusPhone(c[0].contact_phone || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load administration data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function notify(message: string) {
    setSuccess(message);
    setError("");
  }

  async function handleCreateYear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await createAcademicYear({ year_name: yearName, start_date: startDate, end_date: endDate, is_current: isCurrent });
      setYearName(""); setStartDate(""); setEndDate(""); setIsCurrent(false);
      notify("Academic year created successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create academic year.");
    }
  }

  async function handleCurrentYear(year: AcademicYear) {
    try {
      await updateAcademicYear(year.id, { is_current: true });
      notify(`${year.year_name} is now the current academic year.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update academic year.");
    }
  }

  async function handleDeleteYear(id: number) {
    if (!window.confirm("Delete this academic year?")) return;
    try {
      await deleteAcademicYear(id);
      notify("Academic year deleted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete academic year.");
    }
  }

  async function handleCreateProgramme(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await createProgramme({ programme_code: programmeCode, programme_name: programmeName, department, duration_years: Number(duration), total_semesters: Number(duration) * 2 });
      setProgrammeCode(""); setProgrammeName(""); setDepartment(""); setDuration("4");
      notify("Programme created successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create programme.");
    }
  }

  async function handleDeleteProgramme(id: number) {
    if (!window.confirm("Delete this programme?")) return;
    try {
      await deleteProgramme(id);
      notify("Programme deleted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete programme.");
    }
  }

  async function handleCampusSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = { campus_name: campusName, campus_code: campusCode, address: campusAddress, contact_email: campusEmail, contact_phone: campusPhone };
    try {
      if (campuses.length > 0) await updateCampusSettings(campuses[0].id, data);
      else await createCampusSettings(data);
      notify("Campus settings saved successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save campus settings.");
    }
  }

  return (
    <div className="administration-module">
      <div className="page-heading">
        <div><span className="eyebrow">CAMPUS OPERATIONS</span><h1>Administration</h1><p>Manage users, academic configuration and campus settings.</p></div>
        <button className="secondary-button" onClick={() => void loadData()} disabled={loading}>Refresh</button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="success-message">{success}</p>}

      <div className="attendance-summary-cards">
        <div className="attendance-stat"><div><span>Total Users</span><h2>{users.length}</h2></div><Users size={22} /></div>
        <div className="attendance-stat"><div><span>Academic Years</span><h2>{years.length}</h2></div><CalendarDays size={22} /></div>
        <div className="attendance-stat"><div><span>Programmes</span><h2>{programmes.length}</h2></div><GraduationCap size={22} /></div>
        <div className="attendance-stat"><div><span>Audit Activities</span><h2>{logs.length}</h2></div><ClipboardCheck size={22} /></div>
      </div>

      <div className="admin-tabs">
        {[["overview", "Overview"], ["users", "Users & Roles"], ["years", "Academic Years"], ["programmes", "Programmes"], ["campus", "Campus Settings"], ["logs", "Audit Logs"]].map(([key, label]) => (
          <button key={key} className={activeTab === key ? "admin-tab active" : "admin-tab"} onClick={() => { setActiveTab(key); setError(""); setSuccess(""); }}>{label}</button>
        ))}
      </div>

      {loading && <p className="empty-cell">Loading administration data...</p>}

      {!loading && activeTab === "overview" && <section className="panel">
        <div className="panel-heading"><div><h3>Campus Administration Overview</h3><p>Summary of your campus configuration.</p></div></div>
        <div className="admin-overview-grid">
          <div><strong>{users.length}</strong><span>Registered profiles</span></div>
          <div><strong>{users.filter(u => u.role === "Admin").length}</strong><span>Administrators</span></div>
          <div><strong>{users.filter(u => u.role === "Faculty").length}</strong><span>Faculty members</span></div>
          <div><strong>{years.find(y => y.is_current)?.year_name || "Not configured"}</strong><span>Current academic year</span></div>
        </div>
        <p className="demo-note">Configure academic years, programmes and campus information using the tabs above.</p>
      </section>}

      {!loading && activeTab === "users" && <section className="panel">
        <div className="panel-heading"><div><h3>User Profiles and Roles</h3><p>Profiles of existing Supabase Auth users.</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>DEPARTMENT</th><th>ROLE</th><th>STATUS</th></tr></thead><tbody>
          {users.map(user => <tr key={user.id}><td>{user.full_name}</td><td>{user.email}</td><td>{user.department || "—"}</td><td>{user.role}</td><td>{user.is_active ? "Active" : "Inactive"}</td></tr>)}
          {users.length === 0 && <tr><td colSpan={5} className="empty-cell">No user profiles found. Create Auth users and their profiles before managing roles.</td></tr>}
        </tbody></table></div>
        <p className="demo-note">User profile listing only. Account creation and role changes require authenticated Admin permissions.</p>
      </section>}

      {!loading && activeTab === "years" && <>
        <section className="panel"><div className="panel-heading"><div><h3>Add Academic Year</h3><p>Configure the academic calendar.</p></div></div>
          <form onSubmit={handleCreateYear}><div className="form-grid">
            <label>Academic Year<input value={yearName} onChange={e => setYearName(e.target.value)} placeholder="2026-27" required /></label>
            <label>Start Date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required /></label>
            <label>End Date<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required /></label>
            <label className="admin-checkbox"><input type="checkbox" checked={isCurrent} onChange={e => setIsCurrent(e.target.checked)} /> Set as current academic year</label>
          </div><div className="modal-actions"><button className="primary-button" type="submit">Add Academic Year</button></div></form>
        </section>
        <section className="panel"><div className="panel-heading"><div><h3>Academic Years</h3><p>Manage configured academic years.</p></div></div>
          <div className="table-wrap"><table><thead><tr><th>YEAR</th><th>START</th><th>END</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
            {years.map(year => <tr key={year.id}><td>{year.year_name}</td><td>{year.start_date}</td><td>{year.end_date}</td><td>{year.is_current ? "Current" : "Previous"}</td><td><div className="row-actions">{!year.is_current && <button title="Set current" onClick={() => void handleCurrentYear(year)}><CheckCircle2 size={15} /></button>}<button title="Delete" onClick={() => void handleDeleteYear(year.id)}><Trash2 size={15} /></button></div></td></tr>)}
            {years.length === 0 && <tr><td colSpan={5} className="empty-cell">No academic years configured.</td></tr>}
          </tbody></table></div>
        </section>
      </>}

      {!loading && activeTab === "programmes" && <>
        <section className="panel"><div className="panel-heading"><div><h3>Add Programme</h3><p>Configure a campus programme.</p></div></div>
          <form onSubmit={handleCreateProgramme}><div className="form-grid">
            <label>Programme Code<input value={programmeCode} onChange={e => setProgrammeCode(e.target.value)} placeholder="CSE" required /></label>
            <label>Programme Name<input value={programmeName} onChange={e => setProgrammeName(e.target.value)} placeholder="Computer Science and Engineering" required /></label>
            <label>Department<input value={department} onChange={e => setDepartment(e.target.value)} placeholder="CSE Department" required /></label>
            <label>Duration (Years)<select value={duration} onChange={e => setDuration(e.target.value)}><option value="2">2 Years</option><option value="3">3 Years</option><option value="4">4 Years</option><option value="5">5 Years</option></select></label>
          </div><div className="modal-actions"><button className="primary-button" type="submit">Add Programme</button></div></form>
        </section>
        <section className="panel"><div className="panel-heading"><div><h3>Programmes</h3><p>Available campus programmes.</p></div></div>
          <div className="table-wrap"><table><thead><tr><th>CODE</th><th>PROGRAMME</th><th>DEPARTMENT</th><th>DURATION</th><th>SEMESTERS</th><th>ACTION</th></tr></thead><tbody>
            {programmes.map(programme => <tr key={programme.id}><td>{programme.programme_code}</td><td>{programme.programme_name}</td><td>{programme.department}</td><td>{programme.duration_years} years</td><td>{programme.total_semesters}</td><td><button className="icon-button" title="Delete programme" onClick={() => void handleDeleteProgramme(programme.id)}><Trash2 size={15} /></button></td></tr>)}
            {programmes.length === 0 && <tr><td colSpan={6} className="empty-cell">No programmes configured.</td></tr>}
          </tbody></table></div>
        </section>
      </>}

      {!loading && activeTab === "campus" && <section className="panel">
        <div className="panel-heading"><div><h3>Campus Settings</h3><p>Manage campus contact and address information.</p></div></div>
        <form onSubmit={handleCampusSubmit}><div className="form-grid">
          <label>Campus Name<input value={campusName} onChange={e => setCampusName(e.target.value)} placeholder="Main Campus" required /></label>
          <label>Campus Code<input value={campusCode} onChange={e => setCampusCode(e.target.value)} placeholder="MAIN" /></label>
          <label>Contact Email<input type="email" value={campusEmail} onChange={e => setCampusEmail(e.target.value)} /></label>
          <label>Contact Phone<input value={campusPhone} onChange={e => setCampusPhone(e.target.value)} /></label>
          <label className="admin-full-width">Address<textarea value={campusAddress} onChange={e => setCampusAddress(e.target.value)} rows={3} /></label>
        </div><div className="modal-actions"><button className="primary-button" type="submit">Save Campus Settings</button></div></form>
      </section>}

      {!loading && activeTab === "logs" && <section className="panel">
        <div className="panel-heading"><div><h3>Administration Audit Logs</h3><p>Recent recorded administrative activities.</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>DATE</th><th>ACTION</th><th>ENTITY</th><th>ENTITY ID</th><th>DETAILS</th></tr></thead><tbody>
          {logs.map(log => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString("en-IN")}</td><td>{log.action}</td><td>{log.entity_type}</td><td>{log.entity_id || "—"}</td><td>{JSON.stringify(log.details)}</td></tr>)}
          {logs.length === 0 && <tr><td colSpan={5} className="empty-cell">No audit activities recorded yet.</td></tr>}
        </tbody></table></div>
      </section>}
    </div>
  );
}

export default App;
