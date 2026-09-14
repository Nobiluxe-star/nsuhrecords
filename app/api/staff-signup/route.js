import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Use Service Role client to bypass RLS during registration
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req) {
  try {
    const { staff_id, email, password, role, token, school_id } = await req.json();

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (!staff_id && !email) {
      return NextResponse.json(
        { error: "Please provide your Assigned Staff ID or Email address." },
        { status: 400 }
      );
    }

    const assignedRole = (role || "staff").toLowerCase();
    
    // 1. Target table based on role (teachers or general school_personnel)
    const targetTable = assignedRole === "teacher" ? "teachers" : "school_personnel";
const idColumn = assignedRole === "teacher" ? "teacher_id" : "unique_id";

    // 2. Build record verification query
    let query = supabase.from(targetTable).select("*");

    if (staff_id) {
      query = query.eq(idColumn, staff_id.trim());
    } else if (email) {
      query = query.eq("email", email.trim().toLowerCase());
    }

    if (school_id) {
      query = query.eq("school_id", school_id);
    }

    const { data: staffMember, error: staffError } = await query.maybeSingle();

    if (staffError || !staffMember) {
      return NextResponse.json(
        { error: `Staff record not found for the provided credentials.` },
        { status: 404 }
      );
    }

    // 3. Optional token validation
    if (token && staffMember.token && staffMember.token !== token) {
      return NextResponse.json(
        { error: "Invalid verification token." },
        { status: 401 }
      );
    }

    // 4. Construct authentication email fallback
    const resolvedStaffId = staffMember[idColumn] || staff_id;
    const targetEmail = staffMember.email
      ? staffMember.email.trim().toLowerCase()
      : `${resolvedStaffId.toLowerCase()}@nsuhrecords.internal`;

    const fullName = staffMember.name || staffMember.full_name || staffMember.teacher_name || "";
    const resolvedSchoolId = staffMember.school_id || school_id || null;

    // 5. Provision User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: targetEmail,
      password: password,
      options: {
        data: {
          role: assignedRole,
          staff_id: resolvedStaffId,
          school_id: resolvedSchoolId,
          full_name: fullName,
        },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user?.id;

    // 6. Save directly into public.users table
    if (userId) {
      const { error: userInsertError } = await supabase
        .from("users")
        .upsert(
        {
            id: userId,
            email: targetEmail,
            staff_id: resolvedStaffId,
            role: assignedRole,
            school_id: resolvedSchoolId,
            academic_year: staffMember.academic_year || null,
            full_name: fullName,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (userInsertError) {
        console.error("Failed to insert into public.users:", userInsertError.message);
      }
    }

    // 7. Update staff table record to active status and bind user_id
    const { error: updateError } = await supabase
      .from(targetTable)
     .update({
          is_active: true,
          user_id: userId,
        })
      .eq("id", staffMember.id);

    if (updateError) {
      console.error("Failed to update staff status:", updateError.message);
    }

    return NextResponse.json({
      success: true,
      message: "Account activated successfully!",
      user: authData.user,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}