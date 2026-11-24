
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, CalendarCheck, ClipboardList, Award, School,
  UserRound, BookOpen, Wallet, CalendarDays, ChartNoAxesCombined,
  Bell, Settings, LogOut, Menu, Search, ChevronDown, GraduationCap,
  TrendingUp, UserCheck, UserX
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  ["Dashboard", LayoutDashboard],
  ["Students", Users],
  ["Attendance", CalendarCheck],
  ["Examinations", ClipboardList],
  ["Results", Award],
  ["Classes", School],
  ["Teachers", UserRound],
  ["Subjects", BookOpen],
  ["Fees", Wallet],
  ["Timetable", CalendarDays],
  ["Reports", ChartNoAxesCombined],
  ["Settings", Settings],
] as const;

type MonthlyMetric = {
  month: string;
  value: number;
};

type AttendanceMetric = {
  month: string;
  present: number;
  absent: number;
};

function getLastSixMonths() {
  const months: { key: string; label: string }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-US", { month: "short" }),
    });
  }

  return months;
}

function MetricChart({
  title,
  description,
  data,
  color,
  suffix = "",
}: {
  title: string;
  description: string;
  data: MonthlyMetric[];
  color: string;
  suffix?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-[#10264a]">{title}</h3>
      <p className="mt-1 text-[10px] text-slate-500">{description}</p>

      <div className="mt-4 flex h-28 items-end justify-between gap-2">
        {data.map((item) => {
          const height =
            item.value === 0
              ? 2
              : Math.max((item.value / maxValue) * 100, 5);

          return (
            <div
              key={item.month}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span className="text-[9px] font-medium text-slate-600">
                {item.value.toLocaleString()}{suffix}
              </span>

              <div className="flex h-full w-full items-end justify-center">
                <div
                  title={`${item.month}: ${item.value}${suffix}`}
                  className={`w-full max-w-7 rounded-t-md ${color}`}
                  style={{ height: `${height}%` }}
                />
              </div>

              <span className="text-[10px] text-slate-400">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttendanceChart({
  data,
}: {
  data: AttendanceMetric[];
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-[#10264a]">
        Attendance Overview
      </h3>
      <p className="mt-1 text-[10px] text-slate-500">
        Monthly present and absent records
      </p>

      <div className="mt-3 flex gap-3 text-[10px]">
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-emerald-500" />
          Present
        </span>
        <span className="flex items-center gap-1 text-slate-600">
          <span className="h-2 w-2 rounded-sm bg-rose-500" />
          Absent
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {data.map((item) => {
          const total = item.present + item.absent;
          const presentWidth =
            total > 0 ? (item.present / total) * 100 : 0;
          const absentWidth =
            total > 0 ? (item.absent / total) * 100 : 0;

          return (
            <div key={item.month}>
              <div className="mb-1 flex justify-between text-[10px]">
                <span className="font-medium text-slate-600">
                  {item.month}
                </span>
                <span className="text-slate-400">
                  {total} records
                </span>
              </div>

              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                {presentWidth > 0 && (
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${presentWidth}%` }}
                  />
                )}
                {absentWidth > 0 && (
                  <div
                    className="bg-rose-500"
                    style={{ width: `${absentWidth}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardShell({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const [open, setOpen] = useState(true);
  const [active, setActive] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [presentCount, setPresentCount] = useState<number | null>(null);
  const [absentCount, setAbsentCount] = useState<number | null>(null);

  const [schoolName, setSchoolName] = useState("SchoolOS");
  const [logoUrl, setLogoUrl] = useState("");

  const [admissionsData, setAdmissionsData] = useState<MonthlyMetric[]>([]);
  const [feeData, setFeeData] = useState<MonthlyMetric[]>([]);
  const [resultData, setResultData] = useState<MonthlyMetric[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceMetric[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function loadDashboardCounts() {
      const now = new Date();
      const today =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const [
        studentsResult,
        teachersResult,
        presentResult,
        absentResult
      ] = await Promise.all([
        supabase
          .from("students")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("teachers")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("attendance_date", today)
          .eq("status", "Present"),

        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("attendance_date", today)
          .eq("status", "Absent"),
      ]);

      if (mounted) {
        setStudentCount(
          studentsResult.error ? null : studentsResult.count ?? 0
        );
        setTeacherCount(
          teachersResult.error ? null : teachersResult.count ?? 0
        );
        setPresentCount(
          presentResult.error ? null : presentResult.count ?? 0
        );
        setAbsentCount(
          absentResult.error ? null : absentResult.count ?? 0
        );
      }
    }

    void loadDashboardCounts();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Load school name and logo
  useEffect(() => {
    let mounted = true;

    async function loadSchoolSettings() {
      const { data, error } = await supabase
        .from("school_settings")
        .select("school_name, logo_url")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data && mounted) {
        setSchoolName(data.school_name || "SchoolOS");
        setLogoUrl(data.logo_url || "");
      }
    }

    void loadSchoolSettings();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Load monthly analytics from Supabase
  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      setAnalyticsLoading(true);

      const months = getLastSixMonths();
      const firstMonth = months[0].key + "-01";

      const [
        studentsResult,
        attendanceResult,
        feesResult,
        resultsResult,
      ] = await Promise.all([
        supabase
          .from("students")
          .select("created_at")
          .gte("created_at", firstMonth),

        supabase
          .from("attendance")
          .select("attendance_date, status")
          .gte("attendance_date", firstMonth),

        supabase
          .from("fees")
          .select("fee_month, paid_amount")
          .gte("fee_month", firstMonth),

        supabase
          .from("results")
          .select("created_at, obtained_marks, total_marks")
          .gte("created_at", firstMonth),
      ]);

      if (!mounted) return;

      const admissions: MonthlyMetric[] = months.map((month) => ({
        month: month.label,
        value: (studentsResult.data || []).filter(
          (item) => item.created_at?.slice(0, 7) === month.key
        ).length,
      }));

      const attendance: AttendanceMetric[] = months.map((month) => {
        const records = (attendanceResult.data || []).filter(
          (item) => item.attendance_date?.slice(0, 7) === month.key
        );

        return {
          month: month.label,
          present: records.filter((item) => item.status === "Present").length,
          absent: records.filter((item) => item.status === "Absent").length,
        };
      });

      const fees: MonthlyMetric[] = months.map((month) => ({
        month: month.label,
        value: (feesResult.data || [])
          .filter((item) => item.fee_month?.slice(0, 7) === month.key)
          .reduce(
            (sum, item) => sum + Number(item.paid_amount || 0),
            0
          ),
      }));

      const results: MonthlyMetric[] = months.map((month) => {
        const records = (resultsResult.data || []).filter(
          (item) => item.created_at?.slice(0, 7) === month.key
        );

        const totalMarks = records.reduce(
          (sum, item) => sum + Number(item.total_marks || 0),
          0
        );

        const obtainedMarks = records.reduce(
          (sum, item) => sum + Number(item.obtained_marks || 0),
          0
        );

        return {
          month: month.label,
          value: totalMarks > 0
            ? Math.round((obtainedMarks / totalMarks) * 100)
            : 0,
        };
      });

      if (mounted) {
        setAdmissionsData(admissions);
        setAttendanceData(attendance);
        setFeeData(fees);
        setResultData(results);
        setAnalyticsLoading(false);
      }
    }

    void loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function navigate(label: string) {
    setMenuOpen(false);
    setActive(label);

    if (label === "Dashboard") {
      router.push("/dashboard");
    } else if (
      label === "Students" ||
      label === "Student records" ||
      label === "Register a student"
    ) {
      router.push("/students");
    } else if (
      label === "Attendance" ||
      label === "Daily attendance" ||
      label === "Mark attendance"
    ) {
      router.push("/attendance");
    } else if (
      label === "Examinations" ||
      label === "Exam management" ||
      label === "Create examination"
    ) {
      router.push("/examinations");
    } else if (label === "Results") {
      router.push("/results");
    } else if (
      label === "Classes" ||
      label === "Class Management"
    ) {
      router.push("/classes");
    } else if (
      label === "Teachers" ||
      label === "Teacher Management" ||
      label === "Add Teacher"
    ) {
      router.push("/teachers");
    } else if (
      label === "Subjects" ||
      label === "Subject Management" ||
      label === "Add Subject"
    ) {
      router.push("/subjects");
    } else if (
      label === "Fees" ||
      label === "Fee Management" ||
      label === "Collect fee"
    ) {
      router.push("/fees");
    } else if (
      label === "Timetable" ||
      label === "Timetable Management" ||
      label === "Add Timetable"
    ) {
      router.push("/timetable");
    } else if (
      label === "Reports" ||
      label === "Reports Management" ||
      label === "View Reports"
    ) {
      router.push("/reports");
    } else if (
      label === "Settings" ||
      label === "School Settings"
    ) {
      router.push("/settings");
    } else {
      alert(label + " module is not ready yet!");
    }
  }

  const stats = [
    {
      label: "Total Students",
      value: studentCount === null ? "—" : studentCount.toString(),
      note: studentCount === null
        ? "Unable to load student count"
        : "Registered students",
      icon: Users,
    },
    {
      label: "Total Teachers",
      value: teacherCount === null ? "—" : teacherCount.toString(),
      note: teacherCount === null
        ? "Unable to load teacher count"
        : "Registered teachers",
      icon: GraduationCap,
    },
    {
      label: "Present Today",
      value: presentCount === null ? "—" : presentCount.toString(),
      note: "Students present today",
      icon: UserCheck,
    },
    {
      label: "Absent Today",
      value: absentCount === null ? "—" : absentCount.toString(),
      note: "Students absent today",
      icon: UserX,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-[#10264a] text-white transition-all duration-200 lg:flex ${open ? "w-64" : "w-20"}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/15 font-bold">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="School Logo"
                className="h-full w-full object-contain"
                onError={() => setLogoUrl("")}
              />
            ) : (
              <span>{schoolName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          {open && (
            <div className="min-w-0">
              <p className="truncate font-bold tracking-wide">
                {schoolName}
              </p>
              <p className="text-xs text-blue-200">
                Management Portal
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navigation.map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => navigate(label)}
              title={!open ? label : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                active === label
                  ? "bg-white text-[#10264a] shadow"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              <Icon size={19} className="shrink-0" />
              {open && <span>{label}</span>}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-blue-100 hover:bg-white/10"
          >
            <LogOut size={19} />
            {open && "Sign out"}
          </button>
        </div>
      </aside>

      <div className={`min-h-screen transition-all ${open ? "lg:pl-64" : "lg:pl-20"}`}>
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(!open)}
              className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:block"
              aria-label="Toggle sidebar"
            >
              <Menu size={21} />
            </button>

            <div>
              <p className="font-semibold text-[#10264a]">{active}</p>
              <p className="max-w-64 truncate text-xs text-slate-500">
                {schoolName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 sm:flex">
              <Search size={16} className="text-slate-400" />
              <input
                className="w-36 bg-transparent text-sm outline-none"
                placeholder="Search..."
              />
            </div>

            <button
              className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100"
              >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                  {name.slice(0, 1).toUpperCase()}
                </div>

                <div className="hidden text-left sm:block">
                  <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
                    {name}
                  </p>
                  <p className="text-xs capitalize text-slate-500">{role}</p>
                </div>

                <ChevronDown size={15} className="text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-100 bg-white p-2 shadow-lg">
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 md:p-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Overview</p>
              <h1 className="mt-1 text-2xl font-bold text-[#10264a] md:text-3xl">
                Welcome, {name.split(" ")[0]}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Here is your school at a glance.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, note, icon: Icon }, index) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{label}</p>
                  <span
                    className={`rounded-xl p-2 ${
                      [
                        "bg-blue-50 text-blue-700",
                        "bg-violet-50 text-violet-700",
                        "bg-emerald-50 text-emerald-700",
                        "bg-rose-50 text-rose-700",
                      ][index]
                    }`}
                  >
                    <Icon size={20} />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-bold text-[#10264a]">
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-400">{note}</p>
              </div>
            ))}
          </section>

          {/* Compact Live Analytics */}
          <section className="mt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-[#10264a]">
                  School Analytics
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Monthly overview of school performance.
                </p>
              </div>

              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-[10px] font-semibold text-blue-700">
                Last 6 Months
              </span>
            </div>

            {analyticsLoading ? (
              <div className="grid min-h-32 place-items-center rounded-xl border border-slate-100 bg-white text-xs text-slate-500">
                Loading school analytics...
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                <MetricChart
                  title="Monthly Admissions"
                  description="New student records created each month"
                  data={admissionsData}
                  color="bg-blue-600"
                />

                <AttendanceChart data={attendanceData} />

                <MetricChart
                  title="Fee Collection"
                  description="Monthly amount collected (PKR)"
                  data={feeData}
                  color="bg-violet-600"
                />

                <MetricChart
                  title="Examination Performance"
                  description="Average marks percentage by result entry month"
                  data={resultData}
                  color="bg-emerald-600"
                  suffix="%"
                />
              </div>
            )}
          </section>

          <section className="mt-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-[#10264a]">
                    Quick actions
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Common school tasks
                  </p>
                </div>
                <TrendingUp className="text-blue-600" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Register a student", "Student records"],
                  ["Mark attendance", "Daily attendance"],
                  ["Create examination", "Exam management"],
                  ["Add Teacher", "Teacher Management"],
                  ["Add Subject", "Subject Management"],
                  ["Collect fee", "Fee management"],
                  ["Add Timetable", "Timetable Management"],
                  ["View Reports", "Reports Management"],
                ].map(([title, sub]) => (
                  <button
                    key={title}
                    onClick={() => navigate(title)}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-left hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-slate-700">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {sub}
                      </span>
                    </span>
                    <span className="text-blue-600">→</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-slate-400">
            {schoolName} • School Management System
          </p>
        </main>
      </div>
    </div>
  );
}
