"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function RedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token") || "";
    const id = searchParams.get("id") || "";
    router.replace(`/staff-signup?role=teacher&token=${token}&id=${id}`);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <p className="text-gray-400 text-sm">Redirecting to staff signup portal...</p>
    </div>
  );
}

export default function TeacherSignupRedirectPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RedirectContent />
    </Suspense>
  );
}