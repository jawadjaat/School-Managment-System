
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
  CalendarDays,
  Clock,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type TimetableEntry = {
  id: string;
  class_name: string;
  section: string;
  subject_id: string | null;
  teacher_id: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room_number: string | null;
  subjects?: { subject_name: string } | null;
  teachers?: { teacher_name: string } | null;
};

type ClassOption = {
  id: string;
  class_name: string;
  section: string;
};

type SubjectOption = {
  id: string;
  subject_name: string;
  class_name: string;
};

type TeacherOption = {
  id: string;
  teacher_name: string;
};

export default function TimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDay, setSelectedDay] = useState("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const initialForm = {
    class_name: "",
    section: "A",
    subject_id: "",
    teacher_id: "",
    day_of_week: "Monday",
    start_time: "08:00",
    end_time: "09:00",
    room_number: "",
  };

  const [form, setForm] = useState(initialForm);

  async function loadData() {
    setLoading(true);

    const [timetableRes, classesRes, subjectsRes, teachersRes] =
      await Promise.all([
        supabase
          .from("timetable")
          .select("*, subjects(subject_name), teachers(teacher_name)")
          .order("day_of_week")
          .order("start_time"),
        supabase.from("classes").select("*").order("class_name"),
        supabase.from("subjects").select("*").order("subject_name"),
        supabase.from("teachers").select("*").order("teacher_name"),
      ]);

    if (timetableRes.error) {
      alert(timetableRes.error.message);
    } else {
      setEntries((timetableRes.data || []) as TimetableEntry[]);
    }

    if (classesRes.data) setClasses(classesRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) => subject.class_name === form.class_name
      ),
    [subjects, form.class_name]
  );

  const filteredEntries = entries.filter((entry) => {
    const text = [
      entry.class_name,
      entry.section,
      entry.subjects?.subject_name,
      entry.teachers?.teacher_name,
      entry.room_number,
    ]
      .join(" ")
      .toLowerCase();

    return (
      text.includes(search.toLowerCase()) &&
      (selectedDay === "All" || entry.day_of_week === selectedDay)
    );
  });

  function openAddForm() {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
  }

  function openEditForm(entry: TimetableEntry) {
    setEditingId(entry.id);
    setForm({
      class_name: entry.class_name,
      section: entry.section,
      subject_id: entry.subject_id || "",
      teacher_id: entry.teacher_id || "",
      day_of_week: entry.day_of_week,
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      room_number: entry.room_number || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.class_name || !form.subject_id || !form.teacher_id) {
      alert("Please select class, subject and teacher.");
      return;
    }

    if (form.end_time <= form.start_time) {
      alert("End time must be later than start time.");
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      subject_id: form.subject_id,
      teacher_id: form.teacher_id,
      room_number: form.room_number || null,
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("timetable")
        .update(payload)
        .eq("id", editingId);
    } else {
      result = await supabase
        .from("timetable")
        .insert(payload);
    }

    if (result.error) {
      alert(result.error.message);
    } else {
      alert(
        editingId
          ? "Timetable updated successfully!"
          : "Timetable added successfully!"
      );
      setShowForm(false);
      setEditingId(null);
      setForm(initialForm);
      await loadData();
    }

    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Are you sure you want to delete this timetable entry?")) {
      return;
    }

    const { error } = await supabase
      .from("timetable")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      alert("Timetable entry deleted successfully!");
      await loadData();
    }
  }

  const totalClasses = new Set(
    entries.map((entry) => entry.class_name + "-" + entry.section)
  ).size;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Timetable Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage school classes, subjects and teacher schedules.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Plus size={18} />
            Add Timetable
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Entries</p>
              <CalendarDays className="text-blue-700" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {entries.length}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Classes Scheduled</p>
              <CalendarDays className="text-green-600" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {totalClasses}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Teachers</p>
              <Clock className="text-purple-600" />
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {teachers.length}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search class, subject or teacher..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-600"
            />
          </div>

          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none"
          >
            <option value="All">All Days</option>
            {days.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">Class Timetable</h2>
            <p className="mt-1 text-sm text-slate-500">
              All scheduled lessons
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Loading timetable...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarDays className="mx-auto mb-3 text-slate-300" size={40} />
              <p className="font-semibold text-slate-700">
                No timetable entries found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Click Add Timetable to create your first schedule.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Day</th>
                    <th className="px-5 py-4">Class</th>
                    <th className="px-5 py-4">Subject</th>
                    <th className="px-5 py-4">Teacher</th>
                    <th className="px-5 py-4">Time</th>
                    <th className="px-5 py-4">Room</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-blue-800">
                        {entry.day_of_week}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {entry.class_name} - {entry.section}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {entry.subjects?.subject_name || "Not assigned"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {entry.teachers?.teacher_name || "Not assigned"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                        {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {entry.room_number || "-"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditForm(entry)}
                            title="Edit"
                            className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            title="Delete"
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
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
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
            <div className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {editingId ? "Edit Timetable" : "Add Timetable"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter class schedule details.
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Class *
                    </label>
                    <select
                      required
                      value={form.class_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          class_name: e.target.value,
                          subject_id: "",
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <option value="">Select Class</option>
                      {classes.map((item) => (
                        <option key={item.id} value={item.class_name}>
                          {item.class_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Section *
                    </label>
                    <select
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      {["A", "B", "C", "D", "E"].map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Subject *
                    </label>
                    <select
                      required
                      value={form.subject_id}
                      onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <option value="">Select Subject</option>
                      {filteredSubjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.subject_name}
                        </option>
                      ))}
                    </select>
                    {form.class_name && filteredSubjects.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No subjects found for this class. Add a subject first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Teacher *
                    </label>
                    <select
                      required
                      value={form.teacher_id}
                      onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.teacher_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Day *
                    </label>
                    <select
                      value={form.day_of_week}
                      onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      {days.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Room Number
                    </label>
                    <input
                      value={form.room_number}
                      onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                      placeholder="e.g. Room 01"
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      End Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                        ? "Update Timetable"
                        : "Save Timetable"}
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
