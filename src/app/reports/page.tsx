
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileBarChart,
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  Wallet,
  Search,
  RefreshCw,
  Printer,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ReportType =
  | "Students"
  | "Teachers"
  | "Attendance"
  | "Results"
  | "Fees";

type RelatedStudent = {
  student_name?: string | null;
  admission_number?: string | null;
  class_name?: string | null;
};

type RelatedExamination = {
  exam_name?: string | null;
};

type ReportRow = {
  id: string;
  student_name?: string | null;
  teacher_name?: string | null;
  admission_number?: string | null;
  class_name?: string | null;
  father_name?: string | null;
  phone?: string | null;
  email?: string | null;
  qualification?: string | null;
  subject?: string | null;
  subject_name?: string | null;
  exam_name?: string | null;
  status?: string | null;
  fee_type?: string | null;
  fee_month?: string | null;
  amount?: number | string | null;
  paid_amount?: number | string | null;
  salary?: number | string | null;
  total_marks?: number | string | null;
  obtained_marks?: number | string | null;
  attendance_date?: string | null;
  created_at?: string | null;
  students?: RelatedStudent | null;
  examinations?: RelatedExamination | null;
  [key: string]: unknown;
};

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("Students");
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const reportOptions = [
    { name: "Students", icon: Users },
    { name: "Teachers", icon: GraduationCap },
    { name: "Attendance", icon: CalendarCheck },
    { name: "Results", icon: Award },
    { name: "Fees", icon: Wallet },
  ] as const;

  async function loadReport() {
    setLoading(true);

    try {
      let result;

      if (reportType === "Students") {
        result = await supabase
          .from("students")
          .select("*")
          .order("created_at", { ascending: false });
      } else if (reportType === "Teachers") {
        result = await supabase
          .from("teachers")
          .select("*")
          .order("created_at", { ascending: false });
      } else if (reportType === "Attendance") {
        result = await supabase
          .from("attendance")
          .select("*, students(student_name, admission_number, class_name)")
          .order("attendance_date", { ascending: false });
      } else if (reportType === "Results") {
        result = await supabase
          .from("results")
          .select("*, students(student_name, admission_number, class_name), examinations(exam_name)")
          .order("created_at", { ascending: false });
      } else {
        result = await supabase
          .from("fees")
          .select("*, students(student_name, admission_number, class_name)")
          .order("fee_month", { ascending: false });
      }

      if (result.error) {
        alert(result.error.message);
        setData([]);
      } else {
        setData((result.data || []) as unknown as ReportRow[]);
      }
    } catch (error) {
      console.error("Report loading error:", error);
      alert("Unable to load report. Please try again.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  const classes = useMemo(() => {
    const names = data
      .map((item) => item.class_name || item.students?.class_name)
      .filter((name): name is string => Boolean(name));

    return ["All", ...Array.from(new Set(names))];
  }, [data]);

  const filteredData = data.filter((item) => {
    const student = item.students || {};

    const searchableText = [
      item.student_name,
      item.teacher_name,
      item.admission_number,
      item.phone,
      item.email,
      item.subject,
      item.subject_name,
      item.exam_name,
      item.examinations?.exam_name,
      student.student_name,
      student.admission_number,
      item.status,
      item.fee_type,
    ]
      .filter((value) => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();

    const itemClass = item.class_name || student.class_name || "";

    const date =
      item.attendance_date ||
      item.created_at?.slice(0, 10) ||
      item.fee_month ||
      "";

    return (
      searchableText.includes(search.toLowerCase()) &&
      (classFilter === "All" || itemClass === classFilter) &&
      (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate)
    );
  });

  function exportCSV() {
    if (filteredData.length === 0) {
      alert("No records available to export.");
      return;
    }

    const headers = Object.keys(filteredData[0]);

    const csvRows = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];

            const text =
              value === null || value === undefined
                ? ""
                : typeof value === "object"
                ? JSON.stringify(value)
                : String(value);

            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob(
      ["\uFEFF" + csvRows.join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType.toLowerCase()}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printReport() {
    window.print();
  }

  const totalAmount = filteredData.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const collectedAmount = filteredData.reduce(
    (sum, item) => sum + Number(item.paid_amount || 0),
    0
  );

  const averagePercentage =
    reportType === "Results" && filteredData.length
      ? filteredData.reduce(
          (sum, item) =>
            sum +
            (Number(item.total_marks) > 0
              ? (Number(item.obtained_marks) /
                  Number(item.total_marks)) *
                100
              : 0),
          0
        ) / filteredData.length
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Reports Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              View, filter, print and export school reports.
            </p>
          </div>

          <button
            onClick={loadReport}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {reportOptions.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => {
                setReportType(name);
                setSearch("");
                setClassFilter("All");
                setFromDate("");
                setToDate("");
              }}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                reportType === name
                  ? "border-blue-800 bg-blue-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
              }`}
            >
              <Icon size={24} />
              <p className="mt-3 font-semibold">{name}</p>
              <p className={`mt-1 text-xs ${
                reportType === name ? "text-blue-200" : "text-slate-400"
              }`}>
                View {name} report
              </p>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Records</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {filteredData.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              {reportType === "Fees" ? "Total Fee Amount" : "Report Category"}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {reportType === "Fees"
                ? `Rs. ${totalAmount.toLocaleString()}`
                : reportType}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              {reportType === "Fees"
                ? "Collected Amount"
                : reportType === "Results"
                ? "Average Percentage"
                : "Report Status"}
            </p>
            <p className="mt-2 text-2xl font-bold text-green-700">
              {reportType === "Fees"
                ? `Rs. ${collectedAmount.toLocaleString()}`
                : reportType === "Results"
                ? `${averagePercentage.toFixed(1)}%`
                : "Available"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">
            Report Filters
          </h2>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-600"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
            >
              {classes.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
              aria-label="From date"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-3 text-sm"
              aria-label="To date"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={printReport}
              className="flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              <Printer size={17} />
              Print Report
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <FileBarChart className="text-blue-800" />
            <div>
              <h2 className="font-bold text-slate-900">
                {reportType} Report
              </h2>
              <p className="text-xs text-slate-500">
                {filteredData.length} matching records
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Loading report...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No records found for this report.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  {reportType === "Students" && (
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Admission No.</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Phone</th>
                    </tr>
                  )}
                  {reportType === "Teachers" && (
                    <tr>
                      <th className="p-4">Teacher</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Qualification</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Salary</th>
                    </tr>
                  )}
                  {reportType === "Attendance" && (
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  )}
                  {reportType === "Results" && (
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Examination</th>
                      <th className="p-4">Subject</th>
                      <th className="p-4">Marks</th>
                      <th className="p-4">Percentage</th>
                    </tr>
                  )}
                  {reportType === "Fees" && (
                    <tr>
                      <th className="p-4">Student</th>
                      <th className="p-4">Fee Month</th>
                      <th className="p-4">Fee Type</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Paid</th>
                      <th className="p-4">Status</th>
                    </tr>
                  )}
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      {reportType === "Students" && (
                        <>
                          <td className="p-4 font-medium">{item.student_name}</td>
                          <td className="p-4">{item.admission_number}</td>
                          <td className="p-4">{item.class_name}</td>
                          <td className="p-4">{item.phone || "-"}</td>
                        </>
                      )}

                      {reportType === "Teachers" && (
                        <>
                          <td className="p-4 font-medium">{item.teacher_name}</td>
                          <td className="p-4">{item.phone}</td>
                          <td className="p-4">{item.qualification || "-"}</td>
                          <td className="p-4">{item.subject || "-"}</td>
                          <td className="p-4">Rs. {Number(item.salary || 0).toLocaleString()}</td>
                        </>
                      )}

                      {reportType === "Attendance" && (
                        <>
                          <td className="p-4 font-medium">
                            {item.students?.student_name || "Unknown"}
                          </td>
                          <td className="p-4">{item.students?.class_name || "-"}</td>
                          <td className="p-4">{item.attendance_date}</td>
                          <td className="p-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === "Present"
                                ? "bg-green-100 text-green-700"
                                : item.status === "Absent"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </>
                      )}

                      {reportType === "Results" && (
                        <>
                          <td className="p-4 font-medium">
                            {item.students?.student_name || "Unknown"}
                          </td>
                          <td className="p-4">{item.examinations?.exam_name || "-"}</td>
                          <td className="p-4">{item.subject_name}</td>
                          <td className="p-4">
                            {item.obtained_marks} / {item.total_marks}
                          </td>
                          <td className="p-4">
                            {Number(item.total_marks) > 0
                              ? `${((Number(item.obtained_marks) / Number(item.total_marks)) * 100).toFixed(1)}%`
                              : "-"}
                          </td>
                        </>
                      )}

                      {reportType === "Fees" && (
                        <>
                          <td className="p-4 font-medium">
                            {item.students?.student_name || "Unknown"}
                          </td>
                          <td className="p-4">{item.fee_month}</td>
                          <td className="p-4">{item.fee_type}</td>
                          <td className="p-4">Rs. {Number(item.amount).toLocaleString()}</td>
                          <td className="p-4">Rs. {Number(item.paid_amount).toLocaleString()}</td>
                          <td className="p-4">{item.status}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          button, input, select {
            display: none !important;
          }
          main {
            padding: 0 !important;
          }
          table {
            width: 100% !important;
          }
        }
      `}</style>
    </main>
  );
}
