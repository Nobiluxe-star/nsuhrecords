'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function ProgressionSheetContent() {
  const searchParams = useSearchParams();
  const teacherId = searchParams.get('teacherId');
  const subject = searchParams.get('subject');

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId || !subject) {
      setLoading(false);
      return;
    }

    const fetchPublicLogs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('lesson_logs')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('subject_name', subject)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchPublicLogs();
  }, [teacherId, subject]);

  const whatsappMessage = encodeURIComponent(
    "Hello! I saw the live NsuhRecords Progression Sheet viewer. I want to build/order a similar digital management system for my school immediately!"
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] p-3 md:p-8 flex flex-col items-center">
      
      {/* 🔥 AGGRESSIVE ADVERT & LEAD GENERATOR BANNER 🔥 */}
      <div className="w-full max-w-4xl bg-gradient-to-r from-red-700 via-amber-600 to-[#2D5A27] text-white p-4 md:p-5 rounded-2xl shadow-2xl mb-6 border-2 border-amber-400 relative overflow-hidden">
        
        {/* Subtle background badge effect */}
        <div className="absolute -right-10 -bottom-10 opacity-10 font-black text-8xl pointer-events-none select-none">
          NSUH
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="bg-amber-400 text-black font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow tracking-wider animate-pulse">
                ⚡ IMPRESSIVE SOFTWARE?
              </span>
              <span className="text-xs text-amber-200 font-bold uppercase tracking-wide">
                Built by Norbert Che Nsuh
              </span>
            </div>

            <h2 className="text-lg md:text-xl font-extrabold text-white leading-tight">
              Tired of Paperwork, Missing Records & Slow School Operations?
            </h2>

            <p className="text-xs text-amber-100 mt-1 font-medium max-w-xl">
              Get an official customized school management system like <strong className="text-white underline">NsuhRecords</strong> with live teacher tracking, automatic report cards, and instant parent notifications for your secondary school!
            </p>
          </div>

          {/* Action Call Button */}
          <a
            href={`https://wa.me/237682491189?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto text-center bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs md:text-sm px-5 py-3 rounded-xl transition-all duration-200 shadow-xl hover:scale-105 flex items-center justify-center gap-2 whitespace-nowrap border border-white"
          >
            <span>💬 Build One For Your School</span>
            <span className="text-base">🚀</span>
          </a>
        </div>
      </div>

      {/* --- Main Progression Sheet Card --- */}
      <div className="w-full max-w-4xl border-2 border-[#2D5A27] rounded-xl overflow-hidden shadow-xl bg-[#FDFBF7] h-fit">
        
        {/* Forest Green Header */}
        <div className="bg-[#2D5A27] text-white p-4 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h1 className="text-base md:text-lg font-bold uppercase tracking-wide">
              Progression Sheet (Supervisor View-Only)
            </h1>
            <p className="text-xs text-emerald-100 mt-0.5">
              Subject: <strong className="text-white">{subject || 'N/A'}</strong>
            </p>
          </div>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-md text-emerald-100 border border-white/20">
            MINSEC Official Academic Log
          </span>
        </div>

        {/* Content Table */}
        <div className="p-3 md:p-5 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#2D5A27] text-white text-xs font-bold uppercase tracking-wider">
                <th className="p-3 border border-[#2D5A27] w-[12%] text-center">Week</th>
                <th className="p-3 border border-[#2D5A27] w-[18%] text-center">Date & Time</th>
                <th className="p-3 border border-[#2D5A27] w-[50%]">Lesson Taught</th>
                <th className="p-3 border border-[#2D5A27] w-[20%]">Status / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D5A27]/30 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-600 font-medium bg-[#FDFBF7]">
                    Loading lesson logs...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log, index) => {
                  const logDate = log.date_logged || log.created_at;
                  const formattedDate = logDate 
                    ? new Date(logDate).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: '2-digit' })
                    : '-';
                  const formattedTime = logDate 
                    ? new Date(logDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <tr key={log.id || index} className="bg-[#FDFBF7] hover:bg-[#EFECE6]/50">
                      <td className="p-3 border border-[#2D5A27]/40 text-center font-bold text-[#2D5A27] bg-[#EFECE6]">
                        <div className="text-xs font-extrabold">W{log.week_number || (index + 1)}</div>
                      </td>
                      <td className="p-3 border border-[#2D5A27]/40 text-center text-[11px] font-medium text-gray-800 bg-[#FDFBF7]">
                        <div>{formattedDate}</div>
                        {formattedTime && <span className="text-[10px] text-[#2D5A27] font-bold">{formattedTime}</span>}
                      </td>
                      <td className="p-3 border border-[#2D5A27]/40 font-medium text-gray-900 bg-[#FDFBF7]">
                        {log.lesson_title || log.topic_taught || 'No lesson details recorded'}
                      </td>
                      <td className="p-3 border border-[#2D5A27]/40 text-gray-700 bg-[#FDFBF7]">
                        {log.status || log.remarks || 'Completed'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500 italic bg-[#FDFBF7]">
                    No lesson logs found for this subject.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center py-3 text-[11px] text-gray-600 border-t border-[#2D5A27]/20 bg-[#EFECE6]/40">
          NsuhRecords — Creating Powerful Systems for Cameroonian Secondary Schools (+237 682 491 189)
        </div>
      </div>
    </div>
  );
}

export default function ProgressionSheetPublicView() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-600">Loading page...</div>}>
      <ProgressionSheetContent />
    </Suspense>
  );
}