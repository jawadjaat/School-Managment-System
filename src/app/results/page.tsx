
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Award,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";

type Student = {
  id: string;
  student_name: string;
  father_name: string;
  class_name: string;
};

type Exam = {
  id: string;
  exam_name: string;
  class_name: string;
  total_marks: number;
  passing_marks: number;
};

type Result = {
  id: string;
  student_id: string;
  examination_id: string;
  subject_name: string;
  total_marks: number;
  obtained_marks: number;
  created_at: string;
  student?: Student;
  examination?: Exam;
};

const emptyForm = {
  student_id: "",
  examination_id: "",
  subject_name: "",
  total_marks: "100",
  obtained_marks: "",
};

export default function ResultsPage() {
  const supabase = createClient();

  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [filterExam, setFilterExam] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [studentResponse, examResponse, resultResponse] =
      await Promise.all([
        supabase
          .from("students")
          .select("id, student_name, father_name, class_name")
          .order("student_name"),
        supabase
          .from("examinations")
          .select("id, exam_name, class_name, total_marks, passing_marks")
          .order("exam_date", { ascending: false }),
        supabase
          .from("results")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

    if (studentResponse.error || examResponse.error || resultResponse.error) {
      setMessage(
        studentResponse.error?.message ||
        examResponse.error?.message ||
        resultResponse.error?.message ||
        "Data load nahi ho saka."
      );
      setLoading(false);
      return;
    }

    const studentList = (studentResponse.data || []) as Student[];
    const examList = (examResponse.data || []) as Exam[];
    const resultList = (resultResponse.data || []) as Result[];

    setStudents(studentList);
    setExams(examList);

    setResults(
      resultList.map((result) => ({
        ...result,
        student: studentList.find((s) => s.id === result.student_id),
        examination: examList.find((e) => e.id === result.examination_id),
      }))
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedExam = exams.find(
    (exam) => exam.id === form.examination_id
  );

  const percentage =
    Number(form.total_marks) > 0 &&
    form.obtained_marks !== ""
      ? (Number(form.obtained_marks) / Number(form.total_marks)) * 100
      : 0;

  const grade =
    percentage >= 90 ? "A+" :
    percentage >= 80 ? "A" :
    percentage >= 70 ? "B" :
    percentage >= 60 ? "C" :
    percentage >= 50 ? "D" : "F";

  const passStatus =
    selectedExam && form.obtained_marks !== ""
      ? Number(form.obtained_marks) >= selectedExam.passing_marks
        ? "Pass"
        : "Fail"
      : "—";

  const filteredResults = useMemo(() => {
    const term = search.toLowerCase();

    return results.filter((result) => {
      const matchesSearch =
        result.student?.student_name.toLowerCase().includes(term) ||
        result.student?.father_name.toLowerCase().includes(term) ||
        result.student?.class_name.toLowerCase().includes(term) ||
        result.subject_name.toLowerCase().includes(term) ||
        result.examination?.exam_name.toLowerCase().includes(term);

      const matchesExam =
        filterExam === "all" ||
        result.examination_id === filterExam;

      return matchesSearch && matchesExam;
    });
  }, [results, search, filterExam]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveResult = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.student_id || !form.examination_id || !form.subject_name.trim()) {
      setMessage("Please complete all required fields.");
      return;
    }

    const total = Number(form.total_marks);
    const obtained = Number(form.obtained_marks);

    if (
      !Number.isInteger(total) ||
      !Number.isInteger(obtained) ||
      total <= 0 ||
      obtained < 0 ||
      obtained > total
    ) {
      setMessage("Marks sahi enter karein. Obtained marks total se zyada nahi ho sakte.");
      return;
    }

    setSaving(true);
    setMessage("");

    const record = {
      student_id: form.student_id,
      examination_id: form.examination_id,
      subject_name: form.subject_name.trim(),
      total_marks: total,
      obtained_marks: obtained,
    };

    const { error } = editingId
      ? await supabase.from("results").update(record).eq("id", editingId)
      : await supabase.from("results").insert(record);

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(editingId ? "Result updated successfully!" : "Result saved successfully!");
    resetForm();
    await loadData();
  };

  const editResult = (result: Result) => {
    setEditingId(result.id);
    setForm({
      student_id: result.student_id,
      examination_id: result.examination_id,
      subject_name: result.subject_name,
      total_marks: String(result.total_marks),
      obtained_marks: String(result.obtained_marks),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteResult = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this result?")) return;

    const { error } = await supabase
      .from("results")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Result deleted successfully!");
    await loadData();
  };

  const totalRecords = results.length;
  const passedRecords = results.filter((r) => {
    const exam = exams.find((e) => e.id === r.examination_id);
    return exam && r.obtained_marks >= exam.passing_marks;
  }).length;

  const averagePercentage = totalRecords
    ? results.reduce(
        (sum, r) => sum + (r.obtained_marks / r.total_marks) * 100,
        0
      ) / totalRecords
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Results Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage student marks, grades and examination results.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Total Results", value: totalRecords },
            { label: "Passed Results", value: passedRecords },
            { label: "Average Percentage", value: `${averagePercentage.toFixed(1)}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        {message && (
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <span>{message}</span>
            <button onClick={() => setMessage("")}><X size={16} /></button>
          </div>
        )}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Award className="text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">
              {editingId ? "Edit Student Result" : "Add Student Result"}
            </h2>
          </div>

          {students.length === 0 || exams.length === 0 ? (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              Pehle Students aur Examinations modules mein records add karein.
            </p>
          ) : (
            <form onSubmit={saveResult} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Select Student *
                <select
                  required
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                >
                  <option value="">Choose student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.student_name} — {student.class_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Select Examination *
                <select
                  required
                  value={form.examination_id}
                  onChange={(e) => setForm({ ...form, examination_id: e.target.value })}
                  className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                >
                  <option value="">Choose examination</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.exam_name} — {exam.class_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Subject Name *
                <input
                  required
                  value={form.subject_name}
                  onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                  placeholder="e.g. Mathematics"
                  className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Total Marks *
                <input
                  required
                  type="number"
                  min="1"
                  value={form.total_marks}
                  onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                  className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Obtained Marks *
                <input
                  required
                  type="number"
                  min="0"
                  max={form.total_marks}
                  value={form.obtained_marks}
                  onChange={(e) => setForm({ ...form, obtained_marks: e.target.value })}
                  placeholder="Enter marks"
                  className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                />
              </label>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Calculated Percentage</p>
                <p className="text-xl font-bold text-blue-700">
                  {form.obtained_marks !== "" ? `${percentage.toFixed(2)}%` : "—"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Grade: <b>{form.obtained_marks !== "" ? grade : "—"}</b>
                  {" | "}Status: <b>{passStatus}</b>
                </p>
                {selectedExam && (
                  <p className="mt-1 text-xs text-slate-500">
                    Passing marks: {selectedExam.passing_marks}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  <Plus size={17} />
                  {saving ? "Saving..." : editingId ? "Update Result" : "Save Result"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border px-5 py-3 font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Student Results</h2>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={17} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search student or subject..."
                  className="rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={filterExam}
                onChange={(e) => setFilterExam(e.target.value)}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="all">All Examinations</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>{exam.exam_name}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">Loading results...</p>
          ) : filteredResults.length === 0 ? (
            <p className="py-8 text-center text-slate-500">No results found. Add the first result above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {["Student", "Class", "Examination", "Subject", "Marks", "Percentage", "Grade", "Status", "Actions"].map((heading) => (
                      <th key={heading} className="p-3 font-semibold">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredResults.map((result) => {
                    const exam = exams.find((e) => e.id === result.examination_id);
                    const percent = (result.obtained_marks / result.total_marks) * 100;
                    const passed = exam
                      ? result.obtained_marks >= exam.passing_marks
                      : false;

                    const resultGrade =
                      percent >= 90 ? "A+" :
                      percent >= 80 ? "A" :
                      percent >= 70 ? "B" :
                      percent >= 60 ? "C" :
                      percent >= 50 ? "D" : "F";

                    return (
                      <tr key={result.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">
                          {result.student?.student_name || "Unknown"}
                        </td>
                        <td className="p-3">{result.student?.class_name || "—"}</td>
                        <td className="p-3">{exam?.exam_name || "—"}</td>
                        <td className="p-3">{result.subject_name}</td>
                        <td className="p-3">{result.obtained_marks}/{result.total_marks}</td>
                        <td className="p-3">{percent.toFixed(2)}%</td>
                        <td className="p-3 font-semibold">{resultGrade}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {passed ? "Pass" : "Fail"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editResult(result)}
                              title="Edit"
                              className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => deleteResult(result.id)}
                              title="Delete"
                              className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
