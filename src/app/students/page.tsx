
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  admission_number: string;
  student_name: string;
  father_name: string;
  phone: string;
  class_name: string;
  created_at: string;
};

const emptyForm = {
  name: "",
  father: "",
  phone: "",
  className: "",
};

export default function StudentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setStudents(data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const filteredStudents = students.filter((student) => {
    const query = search.trim().toLowerCase();

    return (
      student.student_name.toLowerCase().includes(query) ||
      student.phone.toLowerCase().includes(query) ||
      student.father_name.toLowerCase().includes(query) ||
      student.admission_number.toLowerCase().includes(query)
    );
  });

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveStudent() {
    if (
      !form.name.trim() ||
      !form.father.trim() ||
      !form.phone.trim() ||
      !form.className.trim()
    ) {
      setError("Please fill all fields.");
      return;
    }

    setSaving(true);
    setError("");

    const studentData = {
      student_name: form.name.trim(),
      father_name: form.father.trim(),
      phone: form.phone.trim(),
      class_name: form.className.trim(),
    };

    const result = editingId
      ? await supabase
          .from("students")
          .update(studentData)
          .eq("id", editingId)
      : await supabase
          .from("students")
          .insert(studentData);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setEditingId(null);

    await loadStudents();

    setSaving(false);
    alert(editingId ? "Student updated successfully!" : "Student added successfully!");
  }

  function editStudent(student: Student) {
    setEditingId(student.id);
    setForm({
      name: student.student_name,
      father: student.father_name,
      phone: student.phone,
      className: student.class_name,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteStudent(student: Student) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.student_name}?`
    );

    if (!confirmed) return;

    setError("");

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      setError(error.message);
      return;
    }

    if (editingId === student.id) {
      cancelEdit();
    }

    await loadStudents();
    alert("Student deleted successfully!");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Students Management
            </h1>
            <p className="mt-2 text-slate-500">
              Manage your school student records
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-lg bg-blue-900 px-4 py-2 text-white hover:bg-blue-800"
          >
            Dashboard
          </a>
        </div>

        <div className="mb-6 rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-xl font-bold text-slate-800">
            {editingId ? "Edit Student" : "Add New Student"}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded-lg border p-3"
              placeholder="Student Name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Father Name"
              value={form.father}
              onChange={(e) => updateField("father", e.target.value)}
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />

            <input
              className="rounded-lg border p-3"
              placeholder="Class (e.g. 5)"
              value={form.className}
              onChange={(e) => updateField("className", e.target.value)}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={saveStudent}
              disabled={saving}
              className="rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Student"
                  : "+ Add Student"}
            </button>

            {editingId && (
              <button
                onClick={cancelEdit}
                className="rounded-lg border px-6 py-3 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
              Error: {error}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Student Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Total Students: {students.length}
              </p>
            </div>

            <button
              onClick={() => void loadStudents()}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Refresh Records
            </button>
          </div>

          <input
            className="mb-5 w-full rounded-lg border p-3"
            placeholder="Search by student name, phone or admission number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <p className="py-6 text-center text-slate-500">
              Loading students...
            </p>
          ) : filteredStudents.length === 0 ? (
            <p className="py-6 text-center text-slate-500">
              No students found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead>
                  <tr className="border-b bg-slate-50 text-sm text-slate-600">
                    <th className="p-3">Admission No.</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Father Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Class</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-slate-50">
                      <td className="p-3 font-semibold text-blue-900">
                        {student.admission_number}
                      </td>
                      <td className="p-3">{student.student_name}</td>
                      <td className="p-3">{student.father_name}</td>
                      <td className="p-3">{student.phone}</td>
                      <td className="p-3">{student.class_name}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => editStudent(student)}
                            className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-200"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => void deleteStudent(student)}
                            className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
                          >
                            Delete
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
