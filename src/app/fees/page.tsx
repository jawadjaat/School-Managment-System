
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, RefreshCw, Wallet,
  CheckCircle, Clock, AlertCircle, X, Printer
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  student_name: string;
  admission_number: string | null;
  class_name: string | null;
};

type Fee = {
  id: string;
  student_id: string;
  fee_month: string;
  fee_type: string;
  amount: number;
  paid_amount: number;
  due_date: string | null;
  status: "Paid" | "Unpaid" | "Partial";
  description: string | null;
  students?: Student;
};

const emptyForm = {
  student_id: "",
  fee_month: new Date().toISOString().slice(0, 7) + "-01",
  fee_type: "Monthly Fee",
  amount: "",
  paid_amount: "0",
  due_date: "",
  description: "",
};

export default function FeesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);

    const [feeResult, studentResult] = await Promise.all([
      supabase
        .from("fees")
        .select("*, students(id, student_name, admission_number, class_name)")
        .order("fee_month", { ascending: false }),

      supabase
        .from("students")
        .select("id, student_name, admission_number, class_name")
        .order("student_name"),
    ]);

    if (feeResult.error) {
      alert("Fees load error: " + feeResult.error.message);
    } else {
      setFees((feeResult.data || []) as Fee[]);
    }

    if (studentResult.error) {
      alert("Students load error: " + studentResult.error.message);
    } else {
      setStudents((studentResult.data || []) as Student[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, []);

  function getStatus(amount: number, paid: number): "Paid" | "Unpaid" | "Partial" {
    if (paid >= amount) return "Paid";
    if (paid > 0) return "Partial";
    return "Unpaid";
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(fee: Fee) {
    setEditingId(fee.id);
    setForm({
      student_id: fee.student_id,
      fee_month: fee.fee_month,
      fee_type: fee.fee_type,
      amount: String(fee.amount),
      paid_amount: String(fee.paid_amount),
      due_date: fee.due_date || "",
      description: fee.description || "",
    });
    setShowForm(true);
  }

  async function saveFee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const amount = Number(form.amount);
    const paid = Number(form.paid_amount);

    if (!form.student_id) {
      alert("Please select a student.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid fee amount.");
      return;
    }

    if (!Number.isFinite(paid) || paid < 0 || paid > amount) {
      alert("Paid amount must be between 0 and total amount.");
      return;
    }

    setSaving(true);

    const payload = {
      student_id: form.student_id,
      fee_month: form.fee_month,
      fee_type: form.fee_type.trim(),
      amount,
      paid_amount: paid,
      due_date: form.due_date || null,
      status: getStatus(amount, paid),
      description: form.description.trim() || null,
    };

    const result = editingId
      ? await supabase.from("fees").update(payload).eq("id", editingId)
      : await supabase.from("fees").insert(payload);

    setSaving(false);

    if (result.error) {
      alert("Fee save error: " + result.error.message);
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    await loadData();
  }

  async function deleteFee(id: string) {
    if (!confirm("Are you sure you want to delete this fee record?")) return;

    const { error } = await supabase.from("fees").delete().eq("id", id);

    if (error) {
      alert("Delete error: " + error.message);
      return;
    }

    await loadData();
  }

  const filteredFees = fees.filter((fee) => {
    const student = fee.students;
    const searchText = [
      student?.student_name,
      student?.admission_number,
      student?.class_name,
      fee.fee_type,
    ].join(" ").toLowerCase();

    const matchesSearch = searchText.includes(search.toLowerCase());
    const matchesMonth = !monthFilter || fee.fee_month.slice(0, 7) === monthFilter;
    const matchesStatus = statusFilter === "All" || fee.status === statusFilter;

    return matchesSearch && matchesMonth && matchesStatus;
  });

  const totalAmount = filteredFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
  const totalCollected = filteredFees.reduce((sum, fee) => sum + Number(fee.paid_amount), 0);
  const totalPending = totalAmount - totalCollected;

  function printFees() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#10264a] md:text-3xl">
              Fees Management
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage student fees and payment records
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={printFees}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer size={17} /> Print
            </button>
            <button
              onClick={() => void loadData()}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={17} /> Refresh
            </button>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 rounded-xl bg-[#10264a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              <Plus size={17} /> Add Fee
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Fee Amount</p>
              <Wallet className="text-blue-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-[#10264a]">
              Rs. {totalAmount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">Filtered fee records</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Collected</p>
              <CheckCircle className="text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-emerald-700">
              Rs. {totalCollected.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">Payments received</p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pending Fees</p>
              <Clock className="text-rose-600" />
            </div>
            <p className="mt-3 text-2xl font-bold text-rose-700">
              Rs. {totalPending.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-400">Remaining amount</p>
          </div>
        </section>

        <section className="mb-5 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or admission no..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="All">All Payment Status</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partial">Partial</option>
          </select>
        </section>

        {showForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#10264a]">
                {editingId ? "Edit Fee Record" : "Add New Fee"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveFee} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Student *</label>
                <select
                  required
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.student_name} {student.admission_number ? `(${student.admission_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee Month *</label>
                <input
                  required
                  type="month"
                  value={form.fee_month.slice(0, 7)}
                  onChange={(e) => setForm({ ...form, fee_month: e.target.value + "-01" })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee Type *</label>
                <select
                  value={form.fee_type}
                  onChange={(e) => setForm({ ...form, fee_type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option>Monthly Fee</option>
                  <option>Admission Fee</option>
                  <option>Exam Fee</option>
                  <option>Transport Fee</option>
                  <option>Other Fee</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Total Amount (Rs.) *</label>
                <input
                  required
                  min="1"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Paid Amount (Rs.)</label>
                <input
                  required
                  min="0"
                  type="number"
                  value={form.paid_amount}
                  onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
                  placeholder="e.g. 2000"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional note..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#10264a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update Fee" : "Save Fee"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold text-[#10264a]">Fee Records</h2>
              <p className="mt-1 text-xs text-slate-400">
                {filteredFees.length} records found
              </p>
            </div>
            <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              Fees Register
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading fee records...</div>
          ) : filteredFees.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="mx-auto text-slate-300" size={35} />
              <p className="mt-3 font-semibold text-slate-600">No fee records found</p>
              <p className="mt-1 text-sm text-slate-400">Add a fee record or change your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Fee Month</th>
                    <th className="px-5 py-4">Fee Type</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Paid</th>
                    <th className="px-5 py-4">Pending</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFees.map((fee) => {
                    const pending = Number(fee.amount) - Number(fee.paid_amount);

                    return (
                      <tr key={fee.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{fee.students?.student_name || "Unknown Student"}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {fee.students?.admission_number || "No admission number"}
                            {fee.students?.class_name ? ` • ${fee.students.class_name}` : ""}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {new Date(fee.fee_month + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{fee.fee_type}</td>
                        <td className="px-5 py-4 font-medium">Rs. {Number(fee.amount).toLocaleString()}</td>
                        <td className="px-5 py-4 font-medium text-emerald-700">Rs. {Number(fee.paid_amount).toLocaleString()}</td>
                        <td className="px-5 py-4 font-medium text-rose-700">Rs. {pending.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            fee.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : fee.status === "Partial"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          }`}>
                            {fee.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEditForm(fee)} title="Edit" className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => void deleteFee(fee.id)} title="Delete" className="rounded-lg p-2 text-red-600 hover:bg-red-50">
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
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          SchoolOS • Fees Management
        </p>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          button, input, select { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
