"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

function StaffSignupContent() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract URL Parameters sent from Admin Invite Link
  const tokenParam = searchParams.get("token") || "";
  const idParam = searchParams.get("id") || "";
  const roleParam = searchParams.get("role") || "Staff";
  const schoolIdParam = searchParams.get("school_id") || "";

  // State Management
  const [signupMethod, setSignupMethod] = useState("id");
  const [staffId, setStaffId] = useState(idParam);
  const [schoolId, setSchoolId] = useState(schoolIdParam);
  const [activeSchoolName, setActiveSchoolName] = useState("");
  const [token, setToken] = useState(tokenParam);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Sync URL parameters into state if available
  useEffect(() => {
    if (idParam) setStaffId(idParam);
    if (tokenParam) setToken(tokenParam);
    if (schoolIdParam) setSchoolId(schoolIdParam);
  }, [idParam, tokenParam, schoolIdParam]);

  // Extract Active School Name from localStorage and resolve school_id from Supabase
  useEffect(() => {
    async function resolveSchoolFromStorage() {
      try {
        const storedSchool =
          localStorage.getItem("activeSchoolName") ||
          localStorage.getItem("active_school") ||
          localStorage.getItem("selectedSchool");

        if (storedSchool) {
          setActiveSchoolName(storedSchool);

          // Fetch matching school UUID from assigned_schools table
          const { data: school, error } = await supabase
            .from("assigned_schools")
            .select("id, school_name")
            .ilike("school_name", storedSchool.trim())
            .maybeSingle();

          if (error) {
            console.error("Supabase school lookup error:", error.message);
          }

          if (school && school.id) {
            setSchoolId(school.id);
          }
        }
      } catch (err) {
        console.error("Failed to resolve school ID from storage:", err);
      }
    }

    resolveSchoolFromStorage();
  }, [supabase]);

  // Generate strong password with guaranteed uppercase, lowercase, number, and special character
  const generateSuggestedPassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    const allChars = uppercase + lowercase + numbers + special;

    let newPass = "";
    newPass += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    newPass += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    newPass += numbers.charAt(Math.floor(Math.random() * numbers.length));
    newPass += special.charAt(Math.floor(Math.random() * special.length));

    for (let i = 4; i < 12; i++) {
      newPass += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    newPass = newPass
      .split("")
      .sort(() => 0.5 - Math.random())
      .join("");

    setPassword(newPass);
    setConfirmPassword(newPass);
    setShowPassword(true);
    setShowConfirmPassword(true);
    navigator.clipboard.writeText(newPass);
    setMessage({
      type: "success",
      text: "Strong password generated and copied to clipboard!",
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (signupMethod === "id" && !staffId) {
      setMessage({ type: "error", text: "Please provide your Assigned Staff ID." });
      return;
    }
    if (signupMethod === "email" && !email) {
      setMessage({ type: "error", text: "Please enter your registered Email address." });
      return;
    }
    if (!password || !confirmPassword) {
      setMessage({ type: "error", text: "Please enter and confirm your password." });
      return;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_=+\\\[\];':"\/£$€]/.test(password);

    if (!hasUppercase || !hasSpecialChar) {
      setMessage({
        type: "error",
        text: "Password must contain at least one capital letter and one special character.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/staff-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: signupMethod === "id" ? staffId : null,
          email: signupMethod === "email" ? email : null,
          token: token,
          password: password,
          role: roleParam.toLowerCase(),
          school_id: schoolId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to complete account setup.");
      }

      setMessage({
        type: "success",
        text: "Account setup successful! Redirecting to login page...",
      });

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between p-4 md:p-6">
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-blue-500/20">
            N
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">
              NsuhRecords
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Registry for General & Technical Education
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center my-4">
        <div className="w-full max-w-2xl bg-[#0e1626] border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full mb-3">
              {roleParam} Onboarding {activeSchoolName ? `• ${activeSchoolName}` : ""}
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome to NsuhRecords
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Complete your initial account setup to access your portal.
            </p>
          </div>

          <div className="flex bg-slate-900/90 p-1 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => setSignupMethod("id")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                signupMethod === "id"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign Up via Staff ID
            </button>
            <button
              type="button"
              onClick={() => setSignupMethod("email")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                signupMethod === "email"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign Up via Email
            </button>
          </div>

          {message.text && (
            <div
              className={`p-3.5 mb-5 rounded-xl text-xs md:text-sm font-medium border ${
                message.type === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {signupMethod === "id" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Assigned Staff ID
                  </label>
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="Enter Staff ID"
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Verification Token
                  </label>
                  <input
                    type="text"
                    value={token}
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-slate-300 text-sm font-mono focus:outline-none cursor-not-allowed opacity-80"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  name="username"
                  autoComplete="username"
                  required
                  placeholder="enter.your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password Setup
              </label>
              <button
                type="button"
                onClick={generateSuggestedPassword}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1 transition-colors"
              >
                <span>⚡ Suggest Strong Password</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="new-password"
                  autoComplete="new-password"
                  required
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 bg-slate-900/50 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  {showPassword ? "👁️" : "🙈"}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 bg-slate-900/50 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  {showConfirmPassword ? "👁️" : "🙈"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all duration-200"
            >
              {loading ? "Activating Account..." : "Complete Account Setup"}
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center py-2 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} NsuhRecords System. All rights reserved.
      </footer>
    </div>
  );
}

export default function StaffSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070b14] text-slate-300 flex items-center justify-center">
          Loading portal...
        </div>
      }
    >
      <StaffSignupContent />
    </Suspense>
  );
}