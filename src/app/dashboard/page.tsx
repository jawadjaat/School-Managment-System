
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard-shell";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="max-w-lg rounded-2xl bg-white p-8 shadow">
          <h1 className="text-xl font-bold text-slate-900">
            Profile not configured
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your login works, but your school profile has not been configured.
            Please contact the school administrator.
          </p>
        </div>
      </main>
    );
  }

  // Teachers will use their separate portal.
  if (profile.role === "teacher") {
    redirect("/teacher");
  }

  // Only admin and accountant can use the management dashboard.
  if (profile.role !== "admin" && profile.role !== "accountant") {
    redirect("/login");
  }

  return (
    <DashboardShell
      name={profile.full_name || user.email || "Administrator"}
      role={profile.role}
    />
  );
}
