import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCurrentAcademicYear } from '../../../lib/academicYear';
import { useAcademicConfigs } from '../context/AcademicConfigsContext';

export default function AcademicConfigModal({ 
  isOpen, 
  onClose, 
  onSaveConfig, 
  activeSchoolId, 
  initialConfigType = 'classLevel' 
}) {
  const { refreshConfigs } = useAcademicConfigs();
  const [configType, setConfigType] = useState(initialConfigType);
  const [section, setSection] = useState('General Education');
  const [itemName, setItemName] = useState('');
  const [tradeSection, setTradeSection] = useState('Technical Commercial (STT)');
  const [loading, setLoading] = useState(false);
  const [subjectCategory, setSubjectCategory] = useState('General Core Subjects');

  useEffect(() => {
    if (initialConfigType) {
      setConfigType(initialConfigType);
    }
  }, [initialConfigType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setLoading(true);

    try {
      const targetSection = configType === 'tradeSeries' ? tradeSection : section;
      const trimmedInput = itemName.trim();

      const schoolIdToUse = 
        activeSchoolId?.id ||
        (typeof activeSchoolId === 'string' ? activeSchoolId : null) || 
        localStorage.getItem('active_school_id') || 
        localStorage.getItem('activeSchoolId') || 
        localStorage.getItem('current_school_id');

      if (!schoolIdToUse) {
        alert('Error: No active school ID found. Please select a school first.');
        setLoading(false);
        return;
      }

      const namesList = trimmedInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (namesList.length === 0) {
        alert('Please enter at least one valid name.');
        setLoading(false);
        return;
      }

      const dynamicAcademicYear = 
        activeSchoolId?.academic_year || 
        localStorage.getItem('active_academic_year') || 
        localStorage.getItem('academic_year') || 
        (typeof getCurrentAcademicYear === 'function' ? getCurrentAcademicYear() : null);

      if (!dynamicAcademicYear) {
        alert('Error: Active Academic Year could not be determined. Please verify your school session.');
        setLoading(false);
        return;
      }

      let payloads = [];

      if (configType === 'subject') {
        payloads = namesList.map(subName => ({
          school_id: schoolIdToUse,
          config_type: 'subject',
          section: targetSection,
          category: subjectCategory || 'General Core Subjects',
          name: subName,
          academic_year: dynamicAcademicYear,
          created_at: new Date().toISOString()
        }));
      } else if (configType === 'classLevel') {
        payloads = namesList.map(clsName => ({
          school_id: schoolIdToUse,
          config_type: 'classLevel',
          section: targetSection,
          category: targetSection,
          name: clsName,
          class_level: clsName,
          classLevel: clsName,
          academic_year: dynamicAcademicYear,
          created_at: new Date().toISOString()
        }));
      } else if (configType === 'tradeSeries') {
        const tradeCategory = targetSection.includes('Industrial') 
          ? 'Industrial Trades' 
          : 'Commercial Trades';

        payloads = namesList.map(tradeName => ({
          school_id: schoolIdToUse,
          config_type: 'tradeSeries',
          section: targetSection,
          category: tradeCategory,
          trade_series: tradeName,
          name: tradeName,
          academic_year: dynamicAcademicYear,
          created_at: new Date().toISOString()
        }));
      } else {
        payloads = namesList.map(secName => ({
          school_id: schoolIdToUse,
          config_type: 'section',
          section: secName,
          category: secName,
          name: secName,
          academic_year: dynamicAcademicYear,
          created_at: new Date().toISOString()
        }));
      }

      const { data: insertedData, error } = await supabase
        .from('school_academic_configs')
        .insert(payloads)
        .select();

      if (error) throw error;

      // Force immediate global context re-sync
      if (typeof refreshConfigs === 'function') {
        await refreshConfigs(insertedData);
      }

      if (typeof onSaveConfig === 'function') {
        for (const nameItem of namesList) {
          await onSaveConfig({
            type: configType,
            section: targetSection,
            name: nameItem
          });
        }
      }

      setItemName('');
      onClose();
    } catch (err) {
      console.error('Error saving configuration to Supabase:', err);
      alert('Failed to save configuration: ' + (err.message || 'Check console details'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6 text-white animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
            ⚙ Single Source of Truth: Academic Configuration
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-bold bg-gray-800/60 hover:bg-gray-800 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Configuration Type Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 bg-[#1f2937]/50 p-1.5 rounded-xl border border-gray-700/50">
          <button
            type="button"
            onClick={() => setConfigType('classLevel')}
            className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${
              configType === 'classLevel' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            + Class Level
          </button>
          <button
            type="button"
            onClick={() => setConfigType('tradeSeries')}
            className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${
              configType === 'tradeSeries' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            + Trade / Series
          </button>
          <button
            type="button"
            onClick={() => setConfigType('subject')}
            className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${
              configType === 'subject' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            + Subject
          </button>
          <button
            type="button"
            onClick={() => setConfigType('section')}
            className={`py-2 text-[11px] font-semibold rounded-lg transition-all ${
              configType === 'section' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
            }`}
          >
            + Section
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {configType === 'classLevel' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Target Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="General Education">General Education</option>
                  <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
                  <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  Class Level Name(s) * (Separate multiple with commas, e.g. D1, D2, D3)
                </label>
                <textarea
                  required
                  rows={3}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. D1, D2, D3 or Form 1, Form 2, Form 3"
                  className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {configType === 'tradeSeries' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Parent Technical Section
                </label>
                <select
                  value={tradeSection}
                  onChange={(e) => setTradeSection(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
                  <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  Trade / Series Name(s) * (Separate multiple with commas)
                </label>
                <textarea
                  required
                  rows={3}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. ACC, SES, Electrical Systems"
                  className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {configType === 'subject' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Subject Category
                </label>
                <select
                  value={subjectCategory}
                  onChange={(e) => setSubjectCategory(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="General Core Subjects">General Core Subjects</option>
                  <option value="Commercial Subjects">Commercial Subjects</option>
                  <option value="Industrial Subjects">Industrial Subjects</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Educational Section
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="General Education">General Education</option>
                  <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
                  <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  New Global Subject Name(s) * (Separate multiple with commas)
                </label>
                <textarea
                  required
                  rows={3}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Moral Education, Entrepreneurship, Civics"
                  className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {configType === 'section' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                  New Custom Section Name(s) * (Separate with commas)
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Bilingual Section, Vocational Craft"
                  className="w-full bg-[#1f2937] border border-amber-500/50 rounded-lg px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-400 italic">
            💡 Saves directly to Supabase `school_academic_configs` to instantly populate global lists across registration, teacher assignments, and mark sheets.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium text-xs px-5 py-2.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-2.5 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Saving to Database...' : 'Save & Persist Globally'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}