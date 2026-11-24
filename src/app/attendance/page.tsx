
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Save,
  Download,
  Printer,
  RefreshCw,
  CheckCheck,
  ClipboardList,
} from "lucide-react";

type Student = {
  id: string;
  admission_number: string;
  student_name: string;
  father_name: string;
  class_name: string;
};

type AttendanceStatus = "Present" | "Absent" | "Leave";
type AttendanceMap = Record<string, AttendanceStatus | "">;

export default function AttendancePage() {
  const supabase = useMemo(() => createClient(), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceMap>({});
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  const showMessage = (
    text: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setMessage(text);
    setMessageType(type);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("id, admission_number, student_name, father_name, class_name")
      .order("student_name");

    if (studentError) {
      showMessage(studentError.message, "error");
      setLoading(false);
      return;
    }

    setStudents((studentData || []) as Student[]);

    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("attendance_date", date);

    if (attendanceError) {
      showMessage(attendanceError.message, "error");
      setLoading(false);
      return;
    }

    const saved: AttendanceMap = {};

    (attendanceData || []).forEach((item) => {
      saved[item.student_id] = item.status as AttendanceStatus;
    });

    setAttendance(saved);
    setLoading(false);
  }, [supabase, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const classes = useMemo(
    () => [
      "All Classes",
      ...Array.from(
        new Set(students.map((s) => s.class_name).filter(Boolean))
      ),
    ],
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesClass =
        selectedClass === "All Classes" ||
        student.class_name === selectedClass;

      const term = search.toLowerCase();

      const matchesSearch =
        student.student_name.toLowerCase().includes(term) ||
        student.father_name.toLowerCase().includes(term) ||
        student.admission_number.toLowerCase().includes(term);

      return matchesClass && matchesSearch;
    });
  }, [students, selectedClass, search]);

  const counts = useMemo(() => {
    const present = filteredStudents.filter(
      (s) => attendance[s.id] === "Present"
    ).length;

    const absent = filteredStudents.filter(
      (s) => attendance[s.id] === "Absent"
    ).length;

    const leave = filteredStudents.filter(
      (s) => attendance[s.id] === "Leave"
    ).length;

    return {
      present,
      absent,
      leave,
      total: filteredStudents.length,
      unmarked: filteredStudents.length - present - absent - leave,
    };
  }, [filteredStudents, attendance]);

  function updateStatus(studentId: string, status: AttendanceStatus | "") {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  }

  function markAllPresent() {
    setAttendance((previous) => {
      const updated = { ...previous };

      filteredStudents.forEach((student) => {
        updated[student.id] = "Present";
      });

      return updated;
    });

    showMessage("All visible students marked Present. Please save.", "info");
  }

  function clearVisibleAttendance() {
    setAttendance((previous) => {
      const updated = { ...previous };

      filteredStudents.forEach((student) => {
        updated[student.id] = "";
      });

      return updated;
    });

    showMessage("Visible attendance selections cleared. Save to update records.", "info");
  }

  async function saveAttendance() {
    setSaving(true);
    setMessage("");

    const records = filteredStudents
      .filter((student) => attendance[student.id])
      .map((student) => ({
        student_id: student.id,
        attendance_date: date,
        status: attendance[student.id] as AttendanceStatus,
      }));

    if (records.length === 0) {
      showMessage("Please select attendance for at least one student.", "error");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("attendance")
      .upsert(records, {
        onConflict: "student_id,attendance_date",
      });

    if (error) {
      showMessage("Error: " + error.message, "error");
    } else {
      showMessage("Attendance saved successfully!", "success");
      await loadData();
    }

    setSaving(false);
  }

  function downloadCSV() {
    const rows = [
      ["Admission No", "Student Name", "Father Name", "Class", "Date", "Status"],
      ...filteredStudents.map((student) => [
        student.admission_number,
        student.student_name,
        student.father_name,
        student.class_name,
        date,
        attendance[student.id] || "Not Marked",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <ClipboardList size={17} />
              School Management System
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Attendance Management
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage, update and download student attendance reports.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh Data
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Students</p>
              <Users className="text-blue-600" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {counts.total}
            </h2>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Present</p>
              <CheckCircle className="text-green-600" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-green-600">
              {counts.present}
            </h2>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Absent</p>
              <XCircle className="text-red-600" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-red-600">
              {counts.absent}
            </h2>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Leave</p>
              <Clock className="text-amber-600" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-amber-600">
              {counts.leave}
            </h2>
          </div>

          <div className={cardClass}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Not Marked</p>
              <ClipboardList className="text-slate-500" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-700">
              {counts.unmarked}
            </h2>
          </div>

        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
            <CalendarDays size={19} />
            Attendance Filters
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Select Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
              >
                {classes.map((className) => (
                  <option key={className} value={className}>
                    {className}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Search Student
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-3.5 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or admission number"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-600"
                />
              </div>
            </div>

          </div>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border p-4 text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : messageType === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={markAllPresent}
            disabled={loading || filteredStudents.length === 0}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCheck size={17} />
            Mark All Present
          </button>

          <button
            onClick={clearVisibleAttendance}
            disabled={loading || filteredStudents.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Clear Selection
          </button>

          <button
            onClick={downloadCSV}
            disabled={loading || filteredStudents.length === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <Download size={17} />
            Download CSV
          </button>

          <button
            onClick={printReport}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Printer size={17} />
            Print Report
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Student Attendance Sheet
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {date} · {selectedClass}
              </p>
            </div>

            <button
              onClick={saveAttendance}
              disabled={saving || loading || filteredStudents.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Loading attendance data...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={35} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">
                No students found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add students or change your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap p-4">Admission No.</th>
                    <th className="whitespace-nowrap p-4">Student Name</th>
                    <th className="whitespace-nowrap p-4">Father Name</th>
                    <th className="whitespace-nowrap p-4">Class</th>
                    <th className="whitespace-nowrap p-4">Attendance Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap p-4 font-medium text-blue-700">
                        {student.admission_number}
                      </td>

                      <td className="whitespace-nowrap p-4 font-semibold text-slate-900">
                        {student.student_name}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-600">
                        {student.father_name}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-600">
                        {student.class_name}
                      </td>

                      <td className="p-4">
                        <select
                          value={attendance[student.id] || ""}
                          onChange={(e) =>
                            updateStatus(
                              student.id,
                              e.target.value as AttendanceStatus | ""
                            )
                          }
                          className={`min-w-36 rounded-lg border p-2.5 font-medium outline-none ${
                            attendance[student.id] === "Present"
                              ? "border-green-300 bg-green-50 text-green-700"
                              : attendance[student.id] === "Absent"
                              ? "border-red-300 bg-red-50 text-red-700"
                              : attendance[student.id] === "Leave"
                              ? "border-amber-300 bg-amber-50 text-amber-700"
                              : "border-slate-300 bg-white text-slate-600"
                          }`}
                        >
                          <option value="">Not Marked</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Leave">Leave</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col justify-between gap-2 border-t border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:flex-row">
            <span>
              Showing {filteredStudents.length} students
            </span>
            <span>
              Present: {counts.present} | Absent: {counts.absent} | Leave: {counts.leave}
            </span>
          </div>

        </div>


<div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
  <h3 className="font-semibold text-blue-900">
    Attendance Information
  </h3>
  <p className="mt-2 text-sm leading-6 text-blue-800">
    Select a date and class, mark each student&apos;s attendance and click
    Save Attendance. You can change an existing status and save again
    to update that student&apos;s record. Download CSV to keep a report.
  </p>
</div>

</div>
</main>
);
}
