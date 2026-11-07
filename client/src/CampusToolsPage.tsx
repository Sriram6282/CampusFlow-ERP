import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Student } from "./api";

type Announcement = { id: string; title: string; message: string; createdAt: string };

const STORAGE_KEY = "campusflow-announcements-v1";

function readAnnouncements(): Announcement[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as Announcement[]) : [];
  } catch {
    return [];
  }
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CampusToolsPage({ students }: { students: Student[] }) {
  const [tab, setTab] = useState<"analytics" | "notifications" | "profiles">("analytics");
  const [announcements, setAnnouncements] = useState<Announcement[]>(readAnnouncements);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(students[0]?.dbId ?? null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
  }, [announcements]);

  const selectedStudent = students.find((student) => student.dbId === selectedId) ?? students[0];
  const averageAttendance = students.length
    ? students.reduce((sum, student) => sum + Number(student.attendance || 0), 0) / students.length
    : 0;
  const atRisk = students.filter((student) => student.status === "At Risk");
  const monitor = students.filter((student) => student.status === "Monitor");
  const departments = useMemo(() => {
    const grouped = new Map<string, { count: number; attendance: number; marks: number }>();
    students.forEach((student) => {
      const key = student.programme || "Unspecified";
      const item = grouped.get(key) ?? { count: 0, attendance: 0, marks: 0 };
      item.count += 1;
      item.attendance += Number(student.attendance || 0);
      item.marks += Number(student.marks || 0);
      grouped.set(key, item);
    });
    return [...grouped.entries()].map(([programme, value]) => ({
      programme,
      count: value.count,
      attendance: value.attendance / value.count,
      marks: value.marks / value.count,
    }));
  }, [students]);

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setAnnouncements((items) => [{
      id: `${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    }, ...items]);
    setTitle("");
    setMessage("");
  }

  const exportStudents = () => downloadCsv("campusflow-student-report.csv", [
    ["Roll number", "Student name", "Email", "Programme", "Attendance (%)", "Internal marks", "Risk status"],
    ...students.map((student) => [student.id, student.name, student.email, student.programme, String(student.attendance), String(student.marks), student.status]),
  ]);

  return (
    <main className="campus-tools">
      <header className="campus-tools-heading">
        <div><p className="eyebrow">CAMPUS INSIGHTS</p><h1>Advanced Analytics & Student Services</h1><p>Reports, attendance alerts, announcements and student academic summaries.</p></div>
        <button className="primary-button" onClick={exportStudents} disabled={!students.length}>Export student report</button>
      </header>

      <nav className="campus-tools-tabs" aria-label="Campus tools">
        <button className={tab === "analytics" ? "selected" : ""} onClick={() => setTab("analytics")}>Analytics & Reports</button>
        <button className={tab === "notifications" ? "selected" : ""} onClick={() => setTab("notifications")}>Notifications & Announcements</button>
        <button className={tab === "profiles" ? "selected" : ""} onClick={() => setTab("profiles")}>Student Profiles</button>
      </nav>

      {tab === "analytics" && <section>
        <div className="campus-metric-grid">
          <article><span>Total students</span><strong>{students.length}</strong></article>
          <article><span>Average attendance</span><strong>{averageAttendance.toFixed(1)}%</strong></article>
          <article><span>At-risk students</span><strong>{atRisk.length}</strong></article>
          <article><span>Need monitoring</span><strong>{monitor.length}</strong></article>
        </div>
        <div className="campus-tools-panel">
          <div className="campus-panel-title"><div><h2>Programme-wise performance</h2><p>Calculated from the current student records.</p></div><button className="secondary-button" onClick={() => downloadCsv("campusflow-programme-summary.csv", [["Programme", "Students", "Average attendance (%)", "Average internal marks"], ...departments.map((item) => [item.programme, String(item.count), item.attendance.toFixed(1), item.marks.toFixed(1)])])}>Export summary</button></div>
          <div className="campus-table-wrap"><table><thead><tr><th>Programme</th><th>Students</th><th>Avg. attendance</th><th>Avg. marks</th></tr></thead><tbody>
            {departments.map((item) => <tr key={item.programme}><td>{item.programme}</td><td>{item.count}</td><td>{item.attendance.toFixed(1)}%</td><td>{item.marks.toFixed(1)}</td></tr>)}
            {!departments.length && <tr><td colSpan={4}>No student records available yet.</td></tr>}
          </tbody></table></div>
        </div>
        <div className="campus-tools-panel"><h2>Students requiring attention</h2><div className="campus-table-wrap"><table><thead><tr><th>Roll number</th><th>Name</th><th>Attendance</th><th>Marks</th><th>Status</th></tr></thead><tbody>
          {[...atRisk, ...monitor].map((student) => <tr key={student.dbId}><td>{student.id}</td><td>{student.name}</td><td>{student.attendance}%</td><td>{student.marks}</td><td><span className={`campus-status ${student.status === "At Risk" ? "risk" : "monitor"}`}>{student.status}</span></td></tr>)}
          {!atRisk.length && !monitor.length && <tr><td colSpan={5}>No students currently require attention.</td></tr>}
        </tbody></table></div></div>
      </section>}

      {tab === "notifications" && <section className="campus-tools-columns">
        <div className="campus-tools-panel"><h2>Automatic attendance alerts</h2><p className="campus-muted">Alerts are calculated from current attendance records. Students below 75% are listed here.</p>
          {students.filter((student) => student.attendance < 75).map((student) => <article className="campus-alert" key={student.dbId}><strong>{student.name} ({student.id})</strong><span>Attendance is {student.attendance}%. Follow up with the student.</span></article>)}
          {!students.some((student) => student.attendance < 75) && <p className="campus-empty">No attendance shortage alerts.</p>}
        </div>
        <div className="campus-tools-panel"><h2>Publish an announcement</h2><p className="campus-muted">Announcements are saved in this browser only until a shared Supabase announcements table is configured.</p>
          <form className="campus-announcement-form" onSubmit={publish}><label>Announcement title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} required /></label><label>Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={4} maxLength={1000} required /></label><button className="primary-button" type="submit">Publish announcement</button></form>
          <div className="campus-announcement-list">{announcements.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div><p>{item.message}</p><button className="text-button" onClick={() => setAnnouncements((items) => items.filter((entry) => entry.id !== item.id))}>Delete</button></article>)}{!announcements.length && <p className="campus-empty">No announcements published yet.</p>}</div>
        </div>
      </section>}

      {tab === "profiles" && <section className="campus-tools-columns">
        <div className="campus-tools-panel"><h2>Student directory</h2><label className="campus-select-label">Choose a student<select value={selectedStudent?.dbId ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))}><option value="" disabled>Select student</option>{students.map((student) => <option key={student.dbId} value={student.dbId}>{student.name} — {student.id}</option>)}</select></label><div className="campus-table-wrap"><table><thead><tr><th>Roll number</th><th>Name</th><th>Programme</th></tr></thead><tbody>{students.map((student) => <tr key={student.dbId}><td>{student.id}</td><td>{student.name}</td><td>{student.programme}</td></tr>)}{!students.length && <tr><td colSpan={3}>No students found.</td></tr>}</tbody></table></div></div>
        <div className="campus-tools-panel"><h2>Academic overview</h2>{selectedStudent ? <><div className="campus-profile-name"><strong>{selectedStudent.name}</strong><span>{selectedStudent.id}</span></div><dl className="campus-profile-details"><div><dt>Email</dt><dd>{selectedStudent.email || "Not provided"}</dd></div><div><dt>Programme</dt><dd>{selectedStudent.programme}</dd></div><div><dt>Attendance</dt><dd>{selectedStudent.attendance}%</dd></div><div><dt>Internal marks</dt><dd>{selectedStudent.marks}</dd></div><div><dt>Risk status</dt><dd>{selectedStudent.status}</dd></div></dl><p className="campus-muted">This profile uses fields currently available in the student table. Personal details, semester history and fee history need additional verified database fields.</p></> : <p className="campus-empty">Select a student to view their academic overview.</p>}</div>
      </section>}
      <p className="campus-tools-footnote">Existing Administration includes user management and audit logs. Role permissions remain enforced by the current Admin/Faculty authentication setup.</p>
    </main>
  );
}
