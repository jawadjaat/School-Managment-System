
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CalendarDays,
  BookOpen,
  ClipboardList,
  RefreshCw,
  X,
  Save,
} from "lucide-react";

type Examination = {
  id: string;
  exam_name: string;
  class_name: string;
  exam_date: string;
  total_marks: number;
  passing_marks: number;
  description: string | null;
  created_at: string;
};

const emptyForm = {
  exam_name: "",
  class_name: "",
  exam_date: "",
  total_marks: "100",
  passing_marks: "33",
  description: "",
};

export default function ExaminationsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [exams, setExams] = useState<Examination[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All Classes");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const notify = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    const [examResult, classResult] = await Promise.all([
      supabase
        .from("examinations")
        .select("*")
        .order("exam_date", { ascending: false }),
      supabase
        .from("students")
        .select("class_name")
        .order("class_name"),
    ]);

    if (examResult.error) {
      notify(examResult.error.message, "error");
    } else {
      setExams((examResult.data || []) as Examination[]);
    }

    if (classResult.error) {
      notify(classResult.error.message, "error");
    } else {
      const uniqueClasses = Array.from(
        new Set(
          (classResult.data || [])
            .map((item) => item.class_name)
            .filter(Boolean)
        )
      );
      setClasses(uniqueClasses);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredExams = useMemo(() => {
    const term = search.toLowerCase();

    return exams.filter((exam) => {
      const matchesSearch =
        exam.exam_name.toLowerCase().includes(term) ||
        exam.class_name.toLowerCase().includes(term);

      const matchesClass =
        classFilter === "All Classes" ||
        exam.class_name === classFilter;

      return matchesSearch && matchesClass;
    });
  }, [exams, search, classFilter]);

  const stats = {
    total: exams.length,
    upcoming: exams.filter(
      (exam) => exam.exam_date >= new Date().toLocaleDateString("en-CA")
    ).length,
    completed: exams.filter(
      (exam) => exam.exam_date < new Date().toLocaleDateString("en-CA")
    ).length,
  };

  function updateField(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setMessage("");
  }

  function openEditForm(exam: Examination) {
    setEditingId(exam.id);
    setForm({
      exam_name: exam.exam_name,
      class_name: exam.class_name,
      exam_date: exam.exam_date,
      total_marks: String(exam.total_marks),
      passing_marks: String(exam.passing_marks),
      description: exam.description || "",
    });
    setShowForm(true);
    setMessage("");
  }

  async function saveExam() {
    if (
      !form.exam_name.trim() ||
      !form.class_name ||
      !form.exam_date ||
      !form.total_marks ||
      !form.passing_marks
    ) {
      notify("Please fill all required fields.", "error");
      return;
    }

    const total = Number(form.total_marks);
    const passing = Number(form.passing_marks);

    if (
      !Number.isInteger(total) ||
      !Number.isInteger(passing) ||
      total <= 0 ||
      passing < 0 ||
      passing > total
    ) {
      notify("Please enter valid marks. Passing marks cannot exceed total marks.", "error");
      return;
    }

    setSaving(true);

    const payload = {
      exam_name: form.exam_name.trim(),
      class_name: form.class_name,
      exam_date: form.exam_date,
      total_marks: total,
      passing_marks: passing,
      description: form.description.trim() || null,
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("examinations")
        .update(payload)
        .eq("id", editingId);
      error = result.error;
    } else {
      const { data: { user } } = await supabase.auth.getUser();

      const result = await supabase
        .from("examinations")
        .insert({
          ...payload,
          created_by: user?.id || null,
        });
      error = result.error;
    }

    if (error) {
      notify(error.message, "error");
    } else {
      notify(
        editingId
          ? "Examination updated successfully!"
          : "Examination added successfully!"
      );
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
    }

    setSaving(false);
  }

  async function deleteExam(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this examination?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("examinations")
      .delete()
      .eq("id", id);

    if (error) {
      notify(error.message, "error");
    } else {
      notify("Examination deleted successfully!");
      await loadData();
    }
  }

  const cardClass =
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <BookOpen size={17} />
              School Management System
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Examinations
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create and manage school examinations.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={19} />
            Add Examination
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={cardClass}>
            <p className="text-sm text-slate-500">Total Examinations</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {stats.total}
            </h2>
          </div>

          <div className={cardClass}>
            <p className="text-sm text-slate-500">Upcoming Examinations</p>
            <h2 className="mt-3 text-3xl font-bold text-blue-600">
              {stats.upcoming}
            </h2>
          </div>

          <div className={cardClass}>
            <p className="text-sm text-slate-500">Past Examinations</p>
            <h2 className="mt-3 text-3xl font-bold text-green-600">
              {stats.completed}
            </h2>
          </div>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border p-4 text-sm ${
              messageType === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? "Edit Examination" : "Add New Examination"}
              </h2>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Examination Name *
                </label>
                <input
                  value={form.exam_name}
                  onChange={(e) => updateField("exam_name", e.target.value)}
                  placeholder="e.g. Mid Term Examination"
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select Class *
                </label>
                <select
                  value={form.class_name}
                  onChange={(e) => updateField("class_name", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
                >
                  <option value="">Select Class</option>
                  {classes.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    Add a student with a class first.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Examination Date *
                </label>
                <input
                  type="date"
                  value={form.exam_date}
                  onChange={(e) => updateField("exam_date", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Total Marks *
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.total_marks}
                  onChange={(e) => updateField("total_marks", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Passing Marks *
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.passing_marks}
                  onChange={(e) => updateField("passing_marks", e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <input
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Optional details"
                  className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={saveExam}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? "Saving..." : editingId ? "Update Examination" : "Save Examination"}
              </button>

              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-3.5 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search examination..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-600"
          >
            <option value="All Classes">All Classes</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <ClipboardList size={19} />
              Examination List ({filteredExams.length})
            </h2>
          </div>

          {loading ? (
            <p className="p-10 text-center text-slate-500">
              Loading examinations...
            </p>
          ) : filteredExams.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen size={35} className="mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">
                No examinations found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Click Add Examination to create your first exam.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="p-4">Exam Name</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Total Marks</th>
                    <th className="p-4">Passing Marks</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredExams.map((exam) => (
                    <tr
                      key={exam.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-4 font-semibold text-slate-900">
                        {exam.exam_name}
                        {exam.description && (
                          <p className="mt-1 text-xs font-normal text-slate-500">
                            {exam.description}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-600">
                        {exam.class_name}
                      </td>

                      <td className="whitespace-nowrap p-4 text-slate-600">
                        {exam.exam_date}
                      </td>

                      <td className="p-4 font-medium">
                        {exam.total_marks}
                      </td>

                      <td className="p-4 font-medium">
                        {exam.passing_marks}
                      </td>

                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditForm(exam)}
                            title="Edit Examination"
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            onClick={() => deleteExam(exam.id)}
                            title="Delete Examination"
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
