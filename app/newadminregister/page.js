'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isValidating, setIsValidating] = useState(true);
  const [isLinkValid, setIsLinkValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Read parameters supporting both camelCase and snake_case from URL query
    const idParam = searchParams.get('schoolId') || searchParams.get('school_id') || searchParams.get('id');
    const nameParam = searchParams.get('schoolName') || searchParams.get('school_name') || searchParams.get('name');
    const tokenParam = searchParams.get('token') || searchParams.get('portal_token');
    if (!idParam) {
      setErrorMessage('Missing registration details in link.');
      setIsLinkValid(false);
      setIsValidating(false);
      return;
    }

    setSchoolId(idParam);
    if (nameParam) setSchoolName(decodeURIComponent(nameParam));

    async function checkRegistration() {
      try {
        const { data, error } = await supabase
       .from('assigned_schools')
       .select('school_id, name, admin_email, registration_used')
       .eq('school_id', idParam)
       .eq('portal_token', tokenParam)
       .maybeSingle();

        if (error) {
          setErrorMessage(`Database Error: ${error.message}`);
          setIsLinkValid(false);
          return;
        }

        if (!data) {
          setErrorMessage(`No school found matching ID: ${idParam}`);
          setIsLinkValid(false);
          return;
        }

        if (data.registration_used === true) {
          setErrorMessage('This registration link has already been used.');
          setIsLinkValid(false);
        } else {
          if (data.admin_email) setAdminEmail(data.admin_email);
          if (data.school_name) setSchoolName(data.school_name);
          setIsLinkValid(true);
        }
      } catch (err) {
        setErrorMessage(`Unexpected error: ${err.message}`);
        setIsLinkValid(false);
      } finally {
        setIsValidating(false);
      }
    }

    checkRegistration();
  }, [searchParams]);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const updatePayload = {
        admin_password: password,
        registration_used: true,
        status: 'Active'
      };

      if (adminEmail) {
        updatePayload.admin_email = adminEmail;
      }

      const { error } = await supabase
        .from('assigned_schools')
        .update(updatePayload)
        .eq('school_id', schoolId);

      if (error) {
        alert('Failed to complete registration: ' + error.message);
        setIsSubmitting(false);
        return;
      }

      alert('Registration successful! Redirecting to login...');
      router.push('/');
    } catch (err) {
      alert('An unexpected error occurred during registration.');
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ fontSize: '1.2rem' }}>Validating registration link...</p>
      </div>
    );
  }

  if (!isLinkValid) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #ef4444', borderRadius: '12px', padding: '30px', maxWidth: '450px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444', fontSize: '1.5rem', marginBottom: '10px' }}>Access Denied</h2>
          <p style={{ color: '#94a3b8' }}>{errorMessage || 'Invalid or missing registration link.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '32px', maxWidth: '480px', width: '100%' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '8px', color: '#38bdf8' }}>School Admin Registration</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '24px' }}>
          Set up administrator credentials for <strong style={{ color: '#f8fafc' }}>{schoolName || 'your institution'}</strong>.
        </p>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>School Name</label>
            <input
              type="text"
              value={schoolName}
              disabled
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#94a3b8' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Admin Contact Email</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              disabled={!!adminEmail}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: adminEmail ? '#0f172a' : '#1e293b', color: adminEmail ? '#94a3b8' : '#fff' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Create Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff' }}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: '10px',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isSubmitting ? '#475569' : '#0284c7',
              color: '#fff',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {isSubmitting ? 'Saving Account...' : 'Complete Sign Up & Go to Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p style={{ fontSize: '1.2rem' }}>Loading registration portal...</p>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}