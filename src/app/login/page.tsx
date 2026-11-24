import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-[#10264a] p-12 text-white md:flex">
          <div>
            <div className="mb-12 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-xl font-bold">S</div>
              <span className="text-xl font-semibold tracking-wide">SchoolOS</span>
            </div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[.25em] text-blue-200">School management</p>
            <h1 className="max-w-sm text-4xl font-bold leading-tight">A smarter way to manage your school.</h1>
            <p className="mt-5 max-w-sm leading-7 text-blue-100/80">One secure place for students, teachers, attendance and academic records.</p>
          </div>
          <p className="text-sm text-blue-100/60">Single School Management System</p>
        </section>
        <section className="flex items-center px-7 py-12 sm:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 md:hidden">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#10264a] text-xl font-bold text-white">S</div>
              <p className="text-xl font-bold text-[#10264a]">SchoolOS</p>
            </div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-[#10264a]">Admin login</h2>
            <p className="mt-2 text-sm text-slate-500">Sign in with your school account.</p>
            <div className="mt-8"><LoginForm /></div>
          </div>
        </section>
      </div>
    </main>
  );
}
