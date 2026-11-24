
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Search, Pencil, Trash2, X, RefreshCw,
  Users, Phone, Mail, GraduationCap, IndianRupee,
  BookOpen, ClipboardList
} from "lucide-react";

type Teacher = {
  id: string;
  teacher_name: string;
  father_name: string | null;
  phone: string;
  email: string | null;
  qualification: string | null;
  subject: string | null;
  salary: number | null;
  joining_date: string | null;
  user_id: string | null;
};

type SchoolClass = {
  id: string;
  class_name: string;
  section: string;
};

const emptyForm = {
  teacher_name: "",
  father_name: "",
  phone: "",
  email: "",
  qualification: "",
  subject: "",
  salary: "0",
  joining_date: new Date().toISOString().slice(0, 10),
};

export default function TeachersPage() {
  const supabase = createClient();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [assignmentTeacher, setAssignmentTeacher] = useState<Teacher | null>(null);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);

  async function loadTeachers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
    } else {
      setTeachers((data || []) as Teacher[]);
    }

    setLoading(false);
  }

  async function loadClasses() {
    const { data, error } = await supabase
      .from("classes")
      .select("id, class_name, section")
      .order("class_name");

    if (error) {
      alert("Classes could not be loaded: " + error.message);
      return;
    }

    setClasses((data || []) as SchoolClass[]);
  }

  useEffect(() => {
    loadTeachers();
    loadClasses();
    // Initial page load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTeachers = useMemo(() => {
    const term = search.toLowerCase();

    return teachers.filter((teacher) =>
      [
        teacher.teacher_name,
        teacher.father_name,
        teacher.phone,
        teacher.email,
        teacher.subject,
      ].some((value) => value?.toLowerCase().includes(term))
    );
  }, [teachers, search]);

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(teacher: Teacher) {
    setEditingId(teacher.id);

    setForm({
      teacher_name: teacher.teacher_name,
      father_name: teacher.father_name || "",
      phone: teacher.phone,
      email: teacher.email || "",
      qualification: teacher.qualification || "",
      subject: teacher.subject || "",
      salary: String(teacher.salary ?? 0),
      joining_date: teacher.joining_date || "",
    });

    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.teacher_name.trim() || !form.phone.trim()) {
      alert("Teacher name and phone number are required.");
      return;
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      alert("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    const currentEditingId = editingId;

    const payload = {
      teacher_name: form.teacher_name.trim(),
      father_name: form.father_name.trim() || null,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      qualification: form.qualification.trim() || null,
      subject: form.subject.trim() || null,
      salary: Number(form.salary) || 0,
      joining_date: form.joining_date || null,
    };

    try {
      const existingTeacher = currentEditingId
        ? teachers.find((teacher) => teacher.id === currentEditingId)
        : null;

      let teacherId: string | null = null;
      let saveError = null;

      if (currentEditingId) {
        const result = await supabase
          .from("teachers")
          .update(payload)
          .eq("id", currentEditingId)
          .select("id")
          .single();

        teacherId = result.data?.id || null;
        saveError = result.error;
      } else {
        const result = await supabase
          .from("teachers")
          .insert(payload)
          .select("id")
          .single();

        teacherId = result.data?.id || null;
        saveError = result.error;
      }

      if (saveError || !teacherId) {
        alert(saveError?.message || "Teacher could not be saved.");
        return;
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);

      await loadTeachers();

      const shouldInvite =
        Boolean(payload.email) && !existingTeacher?.user_id;

      if (shouldInvite) {
        const response = await fetch("/api/teachers/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ teacherId }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(
            "Teacher record saved, but invitation could not be sent.\n\n" +
            (result.error || "Unknown error")
          );
          return;
        }

        alert(
          currentEditingId
            ? "Teacher updated successfully! Invitation sent to " + payload.email
            : "Teacher added successfully! Invitation sent to " + payload.email
        );
      } else {
        alert(
          currentEditingId
            ? "Teacher updated successfully!"
            : "Teacher added successfully!"
        );
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function openAssignmentModal(teacher: Teacher) {
    setAssignmentTeacher(teacher);
    setSelectedClassIds([]);
    setAssignmentLoading(true);

    const { data, error } = await supabase
      .from("teacher_classes")
      .select("class_id")
      .eq("teacher_id", teacher.id);

    if (error) {
      alert("Could not load assigned classes: " + error.message);
      setAssignmentTeacher(null);
      setAssignmentLoading(false);
      return;
    }

    setSelectedClassIds((data || []).map((item) => item.class_id));
    setAssignmentLoading(false);
  }

  function toggleClass(classId: string) {
    setSelectedClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId]
    );
  }

  async function saveAssignments() {
    if (!assignmentTeacher) return;

    setAssignmentSaving(true);

    try {
      const { error: deleteError } = await supabase
        .from("teacher_classes")
        .delete()
        .eq("teacher_id", assignmentTeacher.id);

      if (deleteError) {
        alert("Could not update old assignments: " + deleteError.message);
        return;
      }

      if (selectedClassIds.length > 0) {
        const rows = selectedClassIds.map((classId) => ({
          teacher_id: assignmentTeacher.id,
          class_id: classId,
        }));

        const { error: insertError } = await supabase
          .from("teacher_classes")
          .insert(rows);

        if (insertError) {
          alert(
            "Old assignments were removed, but new assignments could not be saved: " +
            insertError.message
          );
          return;
        }
      }

      alert("Teacher classes assigned successfully!");
      setAssignmentTeacher(null);
      setSelectedClassIds([]);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while assigning classes.");
    } finally {
      setAssignmentSaving(false);
    }
  }

  async function deleteTeacher(id: string) {
    if (!confirm("Are you sure you want to delete this teacher?")) {
      return;
    }

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      await loadTeachers();
      alert("Teacher deleted successfully!");
    }
  }

  const totalSalary = teachers.reduce(
    (sum, teacher) => sum + Number(teacher.salary || 0),
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Teachers Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage teachers, accounts and assigned classes
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={19} /> Add New Teacher
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <Users size={23} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Teachers</p>
                <h2 className="text-2xl font-bold text-slate-900">
                  {teachers.length}
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 p-3 text-green-700">
                <GraduationCap size={23} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Subjects</p>
                <h2 className="text-2xl font-bold text-slate-900">
                  {new Set(teachers.map((t) => t.subject).filter(Boolean)).size}
                </h2>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
                <IndianRupee size={23} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Monthly Salary Total</p>
                <h2 className="text-2xl font-bold text-slate-900">
                  Rs. {totalSalary.toLocaleString()}
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
              placeholder="Search teacher, phone, email or subject..."
              className="w-full rounded-xl border bg-white py-3 pl-10 pr-4 outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={() => {
              loadTeachers();
              loadClasses();
            }}
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
                  <th className="p-4">Teacher</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Qualification</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Salary</th>
                  <th className="p-4">Joining Date</th>
                  <th className="p-4">Account</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Loading teachers...
                    </td>
                  </tr>
                ) : filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No teachers found. Add your first teacher.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-semibold text-slate-900">
                          {teacher.teacher_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          S/O: {teacher.father_name || "—"}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="flex items-center gap-1">
                          <Phone size={14} /> {teacher.phone}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Mail size={13} /> {teacher.email || "—"}
                        </p>
                      </td>

                      <td className="p-4">{teacher.qualification || "—"}</td>
                      <td className="p-4">{teacher.subject || "—"}</td>
                      <td className="p-4 font-medium">
                        Rs. {Number(teacher.salary || 0).toLocaleString()}
                      </td>
                      <td className="p-4">{teacher.joining_date || "—"}</td>

                      <td className="p-4">
                        {teacher.user_id ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Linked
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            Not invited
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openAssignmentModal(teacher)}
                            className="rounded-lg bg-green-50 p-2 text-green-700 hover:bg-green-100"
                            title="Assign Classes"
                          >
                            <BookOpen size={16} />
                          </button>

                          <button
                            onClick={() => openEditForm(teacher)}
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => deleteTeacher(teacher.id)}
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
                  {editingId ? "Edit Teacher" : "Add New Teacher"}
                </h2>

                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="grid gap-4 sm:grid-cols-2"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Teacher Name *
                  </label>
                  <input
                    required
                    value={form.teacher_name}
                    onChange={(e) =>
                      setForm({ ...form, teacher_name: e.target.value })
                    }
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="Enter teacher name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Father Name
                  </label>
                  <input
                    value={form.father_name}
                    onChange={(e) =>
                      setForm({ ...form, father_name: e.target.value })
                    }
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="Enter father name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Phone Number *
                  </label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="03XXXXXXXXX"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="teacher@example.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Qualification
                  </label>
                  <input
                    value={form.qualification}
                    onChange={(e) =>
                      setForm({ ...form, qualification: e.target.value })
                    }
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="e.g. MA, MSc, B.Ed"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Subject / Department
                  </label>
                  <input
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                    placeholder="e.g. Mathematics"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Monthly Salary (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.salary}
                    onChange={(e) =>
                      setForm({ ...form, salary: e.target.value })
                    }
                    className="w-full rounded-xl border p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    value={form.joining_date}
                    onChange={(e) =>
                      setForm({ ...form, joining_date: e.target.value })
                    }
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
                    disabled={saving}
                    type="submit"
                    className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Teacher"
                      : "Save Teacher"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {assignmentTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
            <div className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Assign Classes
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {assignmentTeacher.teacher_name}
                  </p>
                </div>

                <button
                  onClick={() => setAssignmentTeacher(null)}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {assignmentLoading ? (
                <div className="py-10 text-center text-slate-500">
                  Loading assigned classes...
                </div>
              ) : classes.length === 0 ? (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  No classes found. First add classes from the Classes page.
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-slate-600">
                    Select all classes that this teacher should access.
                  </p>

                  <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border p-3">
                    {classes.map((schoolClass) => (
                      <label
                        key={schoolClass.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClassIds.includes(schoolClass.id)}
                          onChange={() => toggleClass(schoolClass.id)}
                          className="h-4 w-4 accent-blue-700"
                        />
                        <span className="font-medium text-slate-800">
                          {schoolClass.class_name}
                        </span>
                        <span className="text-sm text-slate-500">
                          Section {schoolClass.section || "—"}
                        </span>
                      </label>
                    ))}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Selected: {selectedClassIds.length} class(es)
                  </p>
                </>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignmentTeacher(null)}
                  className="rounded-xl border px-5 py-3 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    assignmentLoading ||
                    assignmentSaving ||
                    classes.length === 0
                  }
                  onClick={saveAssignments}
                  className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {assignmentSaving ? "Saving..." : "Save Assignments"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
