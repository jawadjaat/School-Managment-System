
"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  School,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  Image as ImageIcon,
  Save,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function SettingsPage() {
  const [schoolName, setSchoolName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("school_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      alert("Unable to load settings: " + error.message);
    } else if (data) {
      setSchoolName(data.school_name || "");
      setLogoUrl(data.logo_url || "");
      setAddress(data.address || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setAcademicYear(data.academic_year || "");
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!schoolName.trim()) {
      alert("Please enter school name.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("school_settings")
      .upsert(
        {
          id: 1,
          school_name: schoolName.trim(),
          logo_url: logoUrl.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          academic_year: academicYear.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      alert("Settings could not be saved: " + error.message);
    } else {
      alert("School settings saved successfully!");
      await loadSettings();
    }

    setSaving(false);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-500">
        Loading school settings...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-800">
                <Settings size={25} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  School Settings
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your school information and details.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={loadSettings}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        <form onSubmit={saveSettings} className="space-y-6">

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <School className="text-blue-800" size={22} />
              <div>
                <h2 className="font-bold text-slate-900">
                  General Information
                </h2>
                <p className="text-xs text-slate-500">
                  Basic details about your school.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  School Name *
                </label>
                <input
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Enter school name"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ImageIcon size={16} />
                  School Logo URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/school-logo.png"
                  className={inputClass}
                />

                {logoUrl && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-slate-500">
                      Logo Preview
                    </p>
                    <img
                      src={logoUrl}
                      alt="School logo preview"
                      className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-contain p-2"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin size={16} />
                  School Address
                </label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter complete school address"
                  className={inputClass}
                />
              </div>

            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <Phone className="text-blue-800" size={22} />
              <div>
                <h2 className="font-bold text-slate-900">
                  Contact Information
                </h2>
                <p className="text-xs text-slate-500">
                  School contact details.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Phone size={16} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XXXXXXXXX"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Mail size={16} />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="school@example.com"
                  className={inputClass}
                />
              </div>

            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-4">
              <CalendarDays className="text-blue-800" size={22} />
              <div>
                <h2 className="font-bold text-slate-900">
                  Academic Information
                </h2>
                <p className="text-xs text-slate-500">
                  Set the current academic year.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Academic Year
              </label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
                className={inputClass}
              />
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

        </form>

        <p className="text-center text-xs text-slate-400">
          SchoolOS • School Settings Management
        </p>

      </div>
    </main>
  );
}
