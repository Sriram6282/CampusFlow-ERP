
import { useEffect, useState } from "react";
import {
  getStudents,
  getAssessments,
  createAssessment,
  getAssessmentMarks,
  saveStudentMark,
  lockAssessment,
} from "./api";

import type { Student, Assessment, StudentMark } from "./api";

export default function InternalMarksPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [semester, setSemester] = useState("1");
  const [maxMarks, setMaxMarks] = useState("30");
  const [assessmentDate, setAssessmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedAssessment =
    assessments.find((item) => item.id === selectedId) ?? null;

  async function loadInitialData() {
    setLoading(true);
    setError("");

    try {
      const [studentData, assessmentData] = await Promise.all([
        getStudents(),
        getAssessments(),
      ]);

      setStudents(studentData);
      setAssessments(assessmentData);

      if (assessmentData.length > 0) {
        setSelectedId((current) =>
          current && assessmentData.some((item) => item.id === current)
            ? current
            : assessmentData[0].id
        );
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load Internal Marks."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMarks(assessmentId: number) {
    try {
      const data = await getAssessmentMarks(assessmentId);
      setMarks(data);

      const values: Record<number, string> = {};
      data.forEach((item) => {
        values[item.student_id] = String(item.marks_obtained);
      });
      setDrafts(values);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load student marks."
      );
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      loadMarks(selectedId);
    } else {
      setMarks([]);
      setDrafts({});
    }
  }, [selectedId]);

  async function handleCreateAssessment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const created = await createAssessment({
        title: title.trim(),
        subject: subject.trim(),
        semester: Number(semester),
        max_marks: Number(maxMarks),
        assessment_date: assessmentDate,
      });

      setAssessments((previous) => [created, ...previous]);
      setSelectedId(created.id);
      setTitle("");
      setSubject("");
      setMessage("Assessment created successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create assessment."
      );
    }
  }

  async function handleSaveMark(studentId: number) {
    if (!selectedAssessment || selectedAssessment.is_locked) return;

    const rawValue = drafts[studentId];

    if (rawValue === undefined || rawValue.trim() === "") {
      setError("Please enter marks before saving.");
      return;
    }

    const value = Number(rawValue);

    if (
      !Number.isFinite(value) ||
      value < 0 ||
      value > Number(selectedAssessment.max_marks)
    ) {
      setError(
        `Enter a valid mark between 0 and ${selectedAssessment.max_marks}.`
      );
      return;
    }

    setSaving(studentId);
    setError("");
    setMessage("");

    try {
      await saveStudentMark(selectedAssessment.id, studentId, value);
      await loadMarks(selectedAssessment.id);
      setMessage("Student marks saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save student marks."
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleLockAssessment() {
    if (!selectedAssessment || selectedAssessment.is_locked) return;

    const confirmed = window.confirm(
      "Lock this assessment? Marks cannot be edited after locking."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const updated = await lockAssessment(selectedAssessment.id);

      setAssessments((previous) =>
        previous.map((item) => item.id === updated.id ? updated : item)
      );

      setMessage("Assessment locked successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to lock assessment."
      );
    }
  }

  const savedCount = marks.length;

  if (loading) {
    return (
      <section className="panel">
        <h3>Loading Internal Marks...</h3>
      </section>
    );
  }

  return (
    <div className="internal-marks-page">
      <section className="panel">
        <div className="marks-page-heading">
          <div>
            <h2>Internal Marks</h2>
            <p>Create assessments and manage student marks.</p>
          </div>
          <span className="subtle-tag">Academic Operations</span>
        </div>
      </section>

      {error && (
        <div className="marks-alert marks-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="marks-alert marks-success" role="status">
          {message}
        </div>
      )}

      <section className="panel">
        <h3>Create New Assessment</h3>

        <form onSubmit={handleCreateAssessment} className="marks-form">
          <label>
            Assessment Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Example: Internal Assessment 1"
              required
            />
          </label>

          <label>
            Subject
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Example: Data Structures"
              required
            />
          </label>

          <label>
            Semester
            <select
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => (
                <option key={number} value={number}>
                  Semester {number}
                </option>
              ))}
            </select>
          </label>

          <label>
            Maximum Marks
            <input
              type="number"
              min="1"
              step="0.01"
              value={maxMarks}
              onChange={(event) => setMaxMarks(event.target.value)}
              required
            />
          </label>

          <label>
            Assessment Date
            <input
              type="date"
              value={assessmentDate}
              onChange={(event) => setAssessmentDate(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="primary-button">
            Create Assessment
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="marks-section-heading">
          <div>
            <h3>Assessment Records</h3>
            <p>Select an assessment to enter student marks.</p>
          </div>

          <span className="subtle-tag">
            {assessments.length} assessments
          </span>
        </div>

        {assessments.length === 0 ? (
          <p className="empty-cell">
            No assessments created yet. Create your first assessment above.
          </p>
        ) : (
          <div className="assessment-list">
            {assessments.map((assessment) => (
              <button
                key={assessment.id}
                type="button"
                className={`assessment-option ${
                  selectedId === assessment.id ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedId(assessment.id);
                  setError("");
                  setMessage("");
                }}
              >
                <strong>{assessment.title}</strong>
                <span>
                  {assessment.subject} · Semester {assessment.semester}
                </span>
                <span>
                  Maximum: {assessment.max_marks} marks
                </span>
                <span>
                  {assessment.is_locked ? "Locked" : "Open"}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedAssessment && (
        <section className="panel">
          <div className="marks-section-heading">
            <div>
              <h3>{selectedAssessment.title}</h3>
              <p>
                {selectedAssessment.subject} · Semester{" "}
                {selectedAssessment.semester} · Maximum{" "}
                {selectedAssessment.max_marks} marks
              </p>
            </div>

            <span className="subtle-tag">
              {selectedAssessment.is_locked ? "Locked" : "Open for entry"}
            </span>
          </div>

          <div className="marks-summary">
            <div>
              <strong>{students.length}</strong>
              <span>Total Students</span>
            </div>
            <div>
              <strong>{savedCount}</strong>
              <span>Marks Saved</span>
            </div>
            <div>
              <strong>{students.length - savedCount}</strong>
              <span>Pending</span>
            </div>
          </div>

          <div className="marks-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Marks Obtained</th>
                  <th>Maximum</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => {
                  const existing = marks.find(
                    (item) => item.student_id === student.dbId
                  );

                  return (
                    <tr key={student.dbId}>
                      <td>{student.name}</td>
                      <td>{student.id}</td>
                      <td>
                        <input
                          className="marks-input"
                          type="number"
                          min="0"
                          max={selectedAssessment.max_marks}
                          step="0.01"
                          value={drafts[student.dbId] ?? ""}
                          disabled={selectedAssessment.is_locked}
                          placeholder="Enter marks"
                          onChange={(event) =>
                            setDrafts((previous) => ({
                              ...previous,
                              [student.dbId]: event.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>{selectedAssessment.max_marks}</td>
                      <td>
                        <button
                          type="button"
                          className="primary-button"
                          disabled={
                            selectedAssessment.is_locked ||
                            saving === student.dbId
                          }
                          onClick={() => handleSaveMark(student.dbId)}
                        >
                          {saving === student.dbId
                            ? "Saving..."
                            : existing
                              ? "Update"
                              : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      No students found. Add students before entering marks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="marks-lock-area">
            <p>
              Locking an assessment prevents further marks changes.
            </p>
            <button
              type="button"
              className="primary-button"
              disabled={selectedAssessment.is_locked}
              onClick={handleLockAssessment}
            >
              {selectedAssessment.is_locked
                ? "Assessment Locked"
                : "Lock Assessment"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
