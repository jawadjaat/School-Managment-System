
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // 1. Check logged-in user
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please login first." },
        { status: 401 }
      );
    }

    // 2. Check Admin role
    const { data: profile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileCheckError) {
      console.error("Admin profile error:", profileCheckError);
      return NextResponse.json(
        { error: profileCheckError.message },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Only administrators can invite teachers." },
        { status: 403 }
      );
    }

    // 3. Get teacher ID
    const body = await request.json();
    const teacherId = body.teacherId;

    if (!teacherId || typeof teacherId !== "string") {
      return NextResponse.json(
        { error: "Teacher ID is required." },
        { status: 400 }
      );
    }

    // 4. Secure admin client
    const admin = createAdminClient();

    const { data: teacher, error: teacherError } = await admin
      .from("teachers")
      .select("id, teacher_name, email, user_id")
      .eq("id", teacherId)
      .maybeSingle();

    // Show actual database error
    if (teacherError || !teacher) {
      console.error("Teacher lookup error:", teacherError);
      console.error("Teacher ID received:", teacherId);

      return NextResponse.json(
        {
          error: teacherError?.message || "Teacher record not found.",
          teacherId,
        },
        { status: 404 }
      );
    }

    if (!teacher.email) {
      return NextResponse.json(
        { error: "Please add the teacher's email address first." },
        { status: 400 }
      );
    }

    if (teacher.user_id) {
      return NextResponse.json(
        { error: "This teacher already has a login account." },
        { status: 409 }
      );
    }

    // 5. Send invitation
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data: invitation, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(
        teacher.email,
        {
          redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
          data: {
            full_name: teacher.teacher_name,
            role: "teacher",
          },
        }
      );

    if (inviteError || !invitation.user) {
      console.error("Invitation error:", inviteError);

      return NextResponse.json(
        { error: inviteError?.message || "Invitation could not be sent." },
        { status: 400 }
      );
    }

    // 6. Create teacher profile
    const { error: profileError } = await admin
      .from("profiles")
      .upsert(
        {
          id: invitation.user.id,
          full_name: teacher.teacher_name,
          role: "teacher",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Teacher profile setup error:", profileError);

      return NextResponse.json(
        {
          error:
            "Invitation sent, but teacher profile setup failed: " +
            profileError.message,
        },
        { status: 500 }
      );
    }

    // 7. Link teacher account
    const { error: linkError } = await admin
      .from("teachers")
      .update({ user_id: invitation.user.id })
      .eq("id", teacher.id);

    if (linkError) {
      console.error("Teacher account linking error:", linkError);

      return NextResponse.json(
        {
          error:
            "Invitation sent, but teacher account linking failed: " +
            linkError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${teacher.email}.`,
    });
  } catch (error) {
    console.error("Teacher invitation error:", error);

    return NextResponse.json(
      { error: "Something went wrong while inviting the teacher." },
      { status: 500 }
    );
  }
}
