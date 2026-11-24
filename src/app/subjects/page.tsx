
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Search, Pencil, Trash2, X, RefreshCw, BookOpen
} from "lucide-react";

type Teacher = {
  id: string;
  teacher_name: string;
};

type Subject = {
  id: string;
  subject_name: string;
  subject_code: string | null;
  class_name: string;
  teacher_id: string | null;
  total_marks: number;
  passing_marks: number;
  teachers?: Teacher | null;
};

const emptyForm = {
  subject_name: "",
  subject_code: "",
  class_name: "",
  teacher_id: "",
  total_marks: "100",
  passing_marks: "33",
};

export default function SubjectsPage() {
  const supabase = createClient();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);

    const [subjectsResult, teachersResult, classesResult] =
      await Promise.all([
        supabase
          .from("subjects")
          .select("*, teachers(id, teacher_name)")
          .order("created_at", { ascending: false }),

        supabase
          .from("teachers")
          .select("id, teacher_name")
          .order("teacher_name"),

        supabase
          .from("classes")
          .select("class_name")
          .order("class_name"),
      ]);

    if (subjectsResult.error) {
      alert(subjectsResult.error.message);
    } else {
      setSubjects((subjectsResult.data || []) as Subject[]);
    }

    if (teachersResult.error) {
      alert(teachersResult.error.message);
    } else {
      setTeachers((teachersResult.data || []) as Teacher[]);
    }

    if (classesResult.error) {
      alert(classesResult.error.message);
    } else {
      const uniqueClasses = [
        ...new Set((classesResult.data || []).map((item) => item.class_name))
      ];
      setClasses(uniqueClasses);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredSubjects = useMemo(() => {
    const term = search.toLowerCase();

    return subjects.filter((subject) =>
      [
        subject.subject_name,
        subject.subject_code,
        subject.class_name,
        subject.teachers?.teacher_name,
      ].some((value) => value?.toLowerCase().includes(term))
    );
  }, [subjects, search]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(subject: Subject) {
    setEditingId(subject.id);

    setForm({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code || "",
      class_name: subject.class_name,
      teacher_id: subject.teacher_id || "",
      total_marks: String(subject.total_marks),
      passing_marks: String(subject.passing_marks),
    });

    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const total = Number(form.total_marks);
    const passing = Number(form.passing_marks);

    if (!form.subject_name.trim() || !form.class_name) {
      alert("Subject name and class are required.");
      return;
    }

    if (
      !Number.isInteger(total) ||
      !Number.isInteger(passing) ||
      total <= 0 ||
      passing < 0 ||
      passing > total
    ) {
      alert("Please enter valid total and passing marks.");
      return;
    }

    setSaving(true);

    const payload = {
      subject_name: form.subject_name.trim(),
      subject_code: form.subject_code.trim() || null,
      class_name: form.class_name,
      teacher_id: form.teacher_id || null,
      total_marks: total,
      passing_marks: passing,
    };

    const result = editingId
      ? await supabase.from("subjects").update(payload).eq("id", editingId)
      : await supabase.from("subjects").insert(payload);

    if (result.error) {
      alert(result.error.message);
    } else {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadData();
      alert(editingId ? "Subject updated successfully!" : "Subject added successfully!");
    }

    setSaving(false);
  }

  async function deleteSubject(id: string) {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    const { error } = await supabase.from("subjects").delete().eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      await loadData();
      alert("Subject deleted successfully!");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Subjects Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage subjects, classes and assigned teachers
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={19} /> Add New Subject
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <BookOpen size={23} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Subjects</p>
                <h2 className="text-2xl font-bold text-slate-900">
                  {subjects.length}
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-3 text-green-700">
                <BookOpen size={23} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Classes Covered</p>
                <h2 className="text-2xl font-bold text-slate-900">
                  {new Set(subjects.map(s => s.class_name)).size}
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-3.5 text-slate-400"
              size={19}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, code, class or teacher..."
              className="w-full rounded-xl border bg-white py-3 pl-10 pr-4 outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-3 text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={17} /> Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Teacher</th>
                  <th className="p-4">Total Marks</th>
                  <th className="p-4">Passing Marks</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Loading subjects...
                    </td>
                  </tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No subjects found. Add your first subject.
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subject) => (
                    <tr key={subject.id} className="hover:bg-slate-50">
                      <td className="p-4 font-semibold text-slate-900">
                        {subject.subject_name}
                      </td>
                      <td className="p-4">{subject.subject_code || "—"}</td>
                      <td className="p-4">{subject.class_name}</td>
                      <td className="p-4">
                        {subject.teachers?.teacher_name || "Not assigned"}
                      </td>
                      <td className="p-4">{subject.total_marks}</td>
                      <td className="p-4">{subject.passing_marks}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditForm(subject)}
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteSubject(subject.id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">

              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? "Edit Subject" : "Add New Subject"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Subject Name *
                  </label>
                  <input
                    required
                    value={form.subject_name}
                    onChange={e => setForm({...form, subject_name: e.target.value})}
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="e.g. Mathematics"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Subject Code
                  </label>
                  <input
                    value={form.subject_code}
                    onChange={e => setForm({...form, subject_code: e.target.value})}
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="e.g. MATH101"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Select Class *
                  </label>
                  <select
                    required
                    value={form.class_name}
                    onChange={e => setForm({...form, class_name: e.target.value})}
                    className="w-full rounded-xl border bg-white p-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                  {classes.length === 0 && (
                    <p className="mt-1 text-xs text-red-500">
                      Please add a class first.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Assign Teacher
                  </label>
                  <select
                    value={form.teacher_id}
                    onChange={e => setForm({...form, teacher_id: e.target.value})}
                    className="w-full rounded-xl border bg-white p-3 outline-none focus:border-blue-500"
                  >
                    <option value="">No teacher assigned</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.teacher_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Total Marks *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.total_marks}
                    onChange={e => setForm({...form, total_marks: e.target.value})}
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Passing Marks *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.passing_marks}
                    onChange={e => setForm({...form, passing_marks: e.target.value})}
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border px-5 py-3 text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving || classes.length === 0}
                    type="submit"
                    className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingId ? "Update Subject" : "Save Subject"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
