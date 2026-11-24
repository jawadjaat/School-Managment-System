
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  Users,
  School,
  X,
} from "lucide-react";

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
  class_teacher: string | null;
  created_at: string;
};

type Student = {
  id: string;
  student_name: string;
  father_name: string;
  class_name: string;
};

const emptyForm = {
  class_name: "",
  section: "A",
  class_teacher: "",
};

export default function ClassesPage() {
  const supabase = createClient();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const [classResponse, studentResponse] = await Promise.all([
      supabase
        .from("classes")
        .select("*")
        .order("class_name")
        .order("section"),
      supabase
        .from("students")
        .select("id, student_name, father_name, class_name")
        .order("student_name"),
    ]);

    if (classResponse.error || studentResponse.error) {
      setMessage(
        classResponse.error?.message ||
        studentResponse.error?.message ||
        "Data load nahi ho saka."
      );
      setLoading(false);
      return;
    }

    setClasses((classResponse.data || []) as SchoolClass[]);
    setStudents((studentResponse.data || []) as Student[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClasses = useMemo(() => {
    const term = search.toLowerCase();

    return classes.filter((item) =>
      `${item.class_name} ${item.section} ${item.class_teacher || ""}`
        .toLowerCase()
        .includes(term)
    );
  }, [classes, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.class_name.trim() || !form.section.trim()) {
      setMessage("Class name aur section zaroor likhein.");
      return;
    }

    setSaving(true);
    setMessage("");

    const record = {
      class_name: form.class_name.trim(),
      section: form.section.trim().toUpperCase(),
      class_teacher: form.class_teacher.trim() || null,
    };

    const { error } = editingId
      ? await supabase.from("classes").update(record).eq("id", editingId)
      : await supabase.from("classes").insert(record);

    setSaving(false);

    if (error) {
      setMessage(
        error.code === "23505"
          ? "Ye class aur section pehle se mojood hain."
          : error.message
      );
      return;
    }

    setMessage(editingId ? "Class updated successfully!" : "Class added successfully!");
    resetForm();
    await loadData();
  };

  const editClass = (item: SchoolClass) => {
    setEditingId(item.id);
    setForm({
      class_name: item.class_name,
      section: item.section,
      class_teacher: item.class_teacher || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteClass = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;

    const { error } = await supabase
      .from("classes")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Class deleted successfully!");
    await loadData();
  };

  const studentCount = (className: string) =>
    students.filter(
      (student) =>
        student.class_name.trim().toLowerCase() ===
        className.trim().toLowerCase()
    ).length;

  const totalAssignedStudents = students.length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Classes Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage school classes, sections and class teachers.
            </p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <School className="text-blue-700" size={22} />
            <p className="mt-3 text-sm text-slate-500">Total Classes</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {classes.length}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Users className="text-green-700" size={22} />
            <p className="mt-3 text-sm text-slate-500">Total Students</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalAssignedStudents}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <Users className="text-purple-700" size={22} />
            <p className="mt-3 text-sm text-slate-500">Class Sections</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {classes.length}
            </p>
          </div>
        </div>

        {message && (
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <span>{message}</span>
            <button onClick={() => setMessage("")}>
              <X size={16} />
            </button>
          </div>
        )}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            {editingId ? "Edit Class" : "Add New Class"}
          </h2>

          <form
            onSubmit={saveClass}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <label className="text-sm font-medium text-slate-700">
              Class Name *
              <input
                required
                value={form.class_name}
                onChange={(e) =>
                  setForm({ ...form, class_name: e.target.value })
                }
                placeholder="e.g. Nursery, Class 1, Class 2"
                className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Section *
              <select
                required
                value={form.section}
                onChange={(e) =>
                  setForm({ ...form, section: e.target.value })
                }
                className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                <option value="E">Section E</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Class Teacher
              <input
                value={form.class_teacher}
                onChange={(e) =>
                  setForm({ ...form, class_teacher: e.target.value })
                }
                placeholder="Teacher name"
                className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-blue-500"
              />
            </label>

            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                <Plus size={17} />
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Class"
                  : "Add Class"}
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
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              All Classes
            </h2>

            <div className="relative">
              <Search
                className="absolute left-3 top-3 text-slate-400"
                size={17}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search classes..."
                className="rounded-xl border py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-slate-500">
              Loading classes...
            </p>
          ) : filteredClasses.length === 0 ? (
            <p className="py-8 text-center text-slate-500">
              No classes found. Add your first class above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      "Class Name",
                      "Section",
                      "Class Teacher",
                      "Students",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="p-3 font-semibold">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredClasses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">
                        {item.class_name}
                      </td>

                      <td className="p-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {item.section}
                        </span>
                      </td>

                      <td className="p-3">
                        {item.class_teacher || "Not assigned"}
                      </td>

                      <td className="p-3 font-semibold">
                        {studentCount(item.class_name)}
                      </td>

                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => editClass(item)}
                            title="Edit"
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => deleteClass(item.id)}
                            title="Delete"
                            className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
