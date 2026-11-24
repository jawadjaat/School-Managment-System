
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GraduationCap, BookOpen, LogOut } from "lucide-react";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "teacher") {
    redirect("/dashboard");
  }

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id, teacher_name, subject")
    .eq("user_id", user.id)
    .maybeSingle();

  if (teacherError) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <p className="text-red-600">Teacher information could not be loaded.</p>
      </main>
    );
  }

  if (!teacher) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <GraduationCap className="mx-auto mb-4 text-blue-700" size={48} />
          <h1 className="text-xl font-bold text-slate-900">
            Teacher Account Not Linked
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Your login is active, but your teacher record is not linked yet.
            Please contact the school administrator.
          </p>
        </div>
      </main>
    );
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("teacher_classes")
    .select("class_id")
    .eq("teacher_id", teacher.id);

  if (assignmentError) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <p className="text-red-600">Assigned classes could not be loaded.</p>
      </main>
    );
  }

  const classIds = (assignments || []).map((item) => item.class_id);

  let classes: {
    id: string;
    class_name: string;
    section: string;
  }[] = [];

  if (classIds.length > 0) {
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, class_name, section")
      .in("id", classIds)
      .order("class_name");

    if (classError) {
      return (
        <main className="min-h-screen bg-slate-50 p-6">
          <p className="text-red-600">Class information could not be loaded.</p>
        </main>
      );
    }

    classes = classData || [];
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-5 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <GraduationCap size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Teacher Portal
              </h1>
              <p className="text-sm text-slate-500">
                School Management System
              </p>
            </div>
          </div>

          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut size={17} />
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <section className="rounded-2xl bg-blue-700 p-7 text-white shadow-sm">
          <p className="text-sm text-blue-100">Welcome back</p>
          <h2 className="mt-2 text-3xl font-bold">
            {teacher.teacher_name || profile.full_name || "Teacher"}
          </h2>
          <p className="mt-2 text-blue-100">
            {teacher.subject || "School Teacher"}
          </p>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                My Assigned Classes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                You can view the classes assigned to your account.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
              {classes.length} Classes
            </span>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
              <BookOpen className="mx-auto mb-3 text-slate-400" size={42} />
              <h3 className="font-semibold text-slate-800">
                No Classes Assigned
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Please contact the administrator to assign your classes.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((schoolClass) => (
                <div
                  key={schoolClass.id}
                  className="rounded-2xl border bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-blue-100 p-3 text-blue-700">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {schoolClass.class_name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Section {schoolClass.section || "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
