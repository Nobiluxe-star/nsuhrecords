'use client';

import { useState, useEffect } from 'react';

export default function EditTeacherModal({
  teacherToEdit,
  isOpen,
  onClose,
  activeSchool,
  ALL_SUBJECTS_LIST = [],
  ALL_AVAILABLE_CLASSES = [],
  technicalCommercialClasses = [],
  technicalIndustrialClasses = []
}) {
  const [teacherName, setTeacherName] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherResidence, setTeacherResidence] = useState('');
  const [teacherQualification, setTeacherQualification] = useState('');
  const [selectedSection, setSelectedSection] = useState('General Education');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  // Pre-fill form when teacherToEdit changes
  useEffect(() => {
    if (teacherToEdit) {
      setTeacherName(teacherToEdit.name || teacherToEdit.full_name || '');
      setTeacherPhone(teacherToEdit.phone || '');
      setTeacherEmail(teacherToEdit.email || '');
      setTeacherResidence(teacherToEdit.residence || teacherToEdit.place_of_residence || '');
      setTeacherQualification(teacherToEdit.qualification || '');
      setSelectedSection(teacherToEdit.section || 'General Education');
    }
  }, [teacherToEdit]);

  if (!isOpen || !teacherToEdit) return null;

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUpdateMessage(null);

    try {
      // Import your supabase client instance dynamically or pass standard update query
      const { supabase } = await import('@/lib/supabaseClient'); // Adjust import path if needed

      const targetId = teacherToEdit.teacher_id || teacherToEdit.id;

      const { error } = await supabase
        .from('teachers')
        .update({
          name: teacherName,
          full_name: teacherName,
          phone: teacherPhone,
          email: teacherEmail,
          residence: teacherResidence,
          qualification: teacherQualification,
          section: selectedSection
        })
        .eq('id', targetId);

      if (error) throw error;

      setUpdateMessage({ type: 'success', text: 'Teacher records and timetable updated successfully!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Update Error:', err);
      setUpdateMessage({ type: 'error', text: err.message || 'Failed to update record in database.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FDFBF7] border border-gray-300 rounded-2xl max-w-4xl w-full p-8 text-gray-900 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
          <div>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Editing Mode Active
            </span>
            <h3 className="text-xl font-bold text-emerald-900 mt-2">
              Update Staff Record: {teacherToEdit?.name || teacherToEdit?.full_name}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Protected System ID: <span className="font-mono text-gray-800 font-semibold">{teacherToEdit?.teacher_id || teacherToEdit?.id}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
          >
            ✕ Close
          </button>
        </div>

        {/* Update Form */}
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Teacher Full Name</label>
              <input 
                type="text" 
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone Number</label>
              <input 
                type="text" 
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input 
                type="email" 
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                required
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Place of Residence</label>
              <input 
                type="text" 
                value={teacherResidence}
                onChange={(e) => setTeacherResidence(e.target.value)}
                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {updateMessage && (
            <div className={`p-3 rounded-lg text-xs font-semibold ${updateMessage.type === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
              {updateMessage.text}
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-8 pt-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Updates...' : 'Save Changes'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}