'use client';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

import React, { useState, useEffect } from 'react';
import {
  GENERAL_CLASSES_CATALOG,
  GENERAL_LOWER_CLASSES,
  TECHNICAL_COMMERCIAL_CATALOG,
  TECHNICAL_INDUSTRIAL_CATALOG,
  GENERAL_SERIES_CATALOG,
  COMMERCIAL_TRADE_SERIES,
  INDUSTRIAL_TRADE_SERIES
} from '../admin-dashboard/page';
export default function BursarDashboard() {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
  }, []);

  const [activeTab, setActiveTab] = useState('registry'); // 'registry', 'receive', 'expense'
  const [searchQuery, setSearchQuery] = useState('');
  // Cascading Section, Class, and Trade Context States
const [section, setSection] = useState('');
const [classLevel, setClassLevel] = useState('');
const [masterClass, setMasterClass] = useState('');
const [selectedSeries, setSelectedSeries] = useState('');
// --- FEE SETUP STATE ---
  const [feeSetupForm, setFeeSetupForm] = useState({
    section: '',
    classLevel: '',
    trade: '',
    tuitionFee: '',
    ptaFee: '',
    medicalFee: ''
  });

  // --- LIVE DATABASE STATES FROM SUPABASE ---
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // --- ANCILLARY REVENUE STATE (Dynamic & Multi-Tenant) ---
  const [otherRevenues, setOtherRevenues] = useState([]);
  const [ancillaryForm, setAncillaryForm] = useState({
    category: 'PTA Levy',
    customCategory: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

// --- SINGLE SOURCE OF TRUTH LOOKUPS ---
  const getFeeClasses = () => {
    if (feeSetupForm.section === 'General Education') {
      return GENERAL_CLASSES_CATALOG || [];
    }
    if (feeSetupForm.section === 'Technical Commercial (STT)') {
      return TECHNICAL_COMMERCIAL_CATALOG || [];
    }
    if (feeSetupForm.section === 'Technical Industrial (IND)') {
      return TECHNICAL_INDUSTRIAL_CATALOG || [];
    }
    return [];
  };

 const getFeeSeries = () => {
    const section = feeSetupForm.section;
    const classLevel = feeSetupForm.classLevel;

    if (!section || !classLevel) return [];

    if (section === 'General Education') {
      // Lower classes (Form 1 to Form 5) return ['N/A']
      if (GENERAL_LOWER_CLASSES && GENERAL_LOWER_CLASSES.includes(classLevel)) {
        return ['N/A'];
      }
      // Upper/Lower Sixth return General Series
      return Array.isArray(GENERAL_SERIES_CATALOG) ? GENERAL_SERIES_CATALOG : [];
    }

    if (section === 'Technical Commercial (STT)') {
      return Array.isArray(COMMERCIAL_TRADE_SERIES) ? COMMERCIAL_TRADE_SERIES : [];
    }

    if (section === 'Technical Industrial (IND)') {
      return Array.isArray(INDUSTRIAL_TRADE_SERIES) ? INDUSTRIAL_TRADE_SERIES : [];
    }

    return [];
  };
  
  // Dynamic Ancillary Submission (Preset Dropdown OR Manual Custom Fill)
  // Dynamic Ancillary Submission
  const handleAddAncillary = (e) => {
    e.preventDefault();
    if (!ancillaryForm.amount || !ancillaryForm.description) return;

    const finalCategory =
      ancillaryForm.category === 'Custom / Other'
        ? ancillaryForm.customCategory || 'Other Revenue'
        : ancillaryForm.category;

    setOtherRevenues((prev) => [
      {
        id: Date.now(),
        category: finalCategory,
        description: ancillaryForm.description,
        amount: Number(ancillaryForm.amount),
        date: ancillaryForm.date,
        recordedBy: 'Bursar',
      },
      ...prev,
    ]);

    setAncillaryForm({
      category: 'PTA Levy',
      customCategory: '',
      description: '',
      amount: '',
      date: '',
    });
  };

  // Class Fee Configuration Handler
 const handleSaveFeeSetup = (e) => {
    e.preventDefault();
    if (!feeSetupForm.classLevel) return;

    setFeeConfigurations((prev) => [
      {
        id: Date.now(),
        section: feeSetupForm.section,
        classLevel: feeSetupForm.classLevel,
        trade: feeSetupForm.trade || 'N/A',
        tuitionFee: Number(feeSetupForm.amount || feeSetupForm.tuitionFee) || 0,
        ptaFee: Number(feeSetupForm.ptaFee) || 0,
        medicalFee: Number(feeSetupForm.medicalFee) || 0,
      },
      ...prev.filter(
        (item) =>
          !(
            item.section === feeSetupForm.section &&
            item.classLevel === feeSetupForm.classLevel &&
            item.trade === (feeSetupForm.trade || 'N/A')
          )
      ),
    ]);

    setFeeSetupForm({
      section: '',
      classLevel: '',
      trade: '',
      feeType: 'Tuition',
      amount: '',
      tuitionFee: '',
      ptaFee: '',
      medicalFee: ''
    });
  };
  // Fetch all live data from Supabase tables
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingStudents(true);
      try {
        // 1. Fetch live registered students
        const { data: studentsData, error: studentsErr } = await supabase
          .from('students')
          .select('*');
        if (!studentsErr && studentsData) setRegisteredStudents(studentsData);

        // 2. Fetch live payments history
        const { data: paymentsData, error: paymentsErr } = await supabase
          .from('payments')
          .select('*');
        if (!paymentsErr && paymentsData) setPayments(paymentsData);

        // 3. Fetch live recorded expenses
        const { data: expensesData, error: expensesErr } = await supabase
          .from('expenses')
          .select('*');
        if (!expensesErr && expensesData) setExpenses(expensesData);

      } catch (err) {
        console.error('Unexpected error loading dashboard data:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchDashboardData();
  }, []);

  // --- FILTER STATES FOR RECEIVE PAYMENT TAB ---
  const [paySection, setPaySection] = useState('');
  const [payClassLevel, setPayClassLevel] = useState('');
  const [payTrade, setPayTrade] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // --- FILTER STATES FOR FEE REGISTRY TAB ---
  const [regSection, setRegSection] = useState('');
  const [regClassLevel, setRegClassLevel] = useState('');
  const [regTrade, setRegTrade] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    feeType: 'Tuition',
    amountPaid: '',
    totalFee: '',
    paymentMethod: 'Cash',
  });

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    category: 'Operational',
    amount: '',
    recipient: '',
  });

  // Reset secondary cascading dropdowns
  useEffect(() => {
    setPayClassLevel('');
    setPayTrade('');
    setSelectedStudentId('');
  }, [paySection]);

  useEffect(() => {
    setRegClassLevel('');
    setRegTrade('');
  }, [regSection]);
// Clear Trade if Class changes to a General Lower Class (Forms 1-5)
  useEffect(() => {
    if (regSection === 'General Education' && GENERAL_LOWER_CLASSES.includes(regClassLevel)) {
      setRegTrade('');
    }
  }, [regClassLevel, regSection]);
 // Auto-fill Student Info when selected in Receive Payment Tab
  const activeStudentObj = registeredStudents.find((s) => s.id === selectedStudentId);

  // Clear payment form totalFee if no student is active
  useEffect(() => {
    if (!activeStudentObj) {
      setPaymentForm((prev) => ({ ...prev, totalFee: '' }));
    }
  }, [selectedStudentId, activeStudentObj]);
  // Aggregation Summary
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysRevenue = payments.filter((p) => p.date === todayStr).reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const todaysExpenses = expenses.filter((e) => e.date === todayStr).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalTuitionCollected = payments.filter((p) => p.feeType === 'Tuition').reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const totalOtherRevenue = payments.filter((p) => p.feeType !== 'Tuition').reduce((sum, p) => sum + Number(p.amountPaid), 0);

  // Form Submissions
  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!activeStudentObj) {
      alert('Please filter and select a student from the system before submitting.');
      return;
    }
    if (!paymentForm.amountPaid || !paymentForm.totalFee) {
      alert('Please state amount paid and total expected fee.');
      return;
    }

    const newPayment = {
      id: `REC-2026-00${payments.length + 1}`,
      studentName: activeStudentObj.name,
      studentId: activeStudentObj.id,
      department: activeStudentObj.department,
      class: activeStudentObj.class,
      trade: activeStudentObj.trade,
      feeType: paymentForm.feeType,
      amountPaid: Number(paymentForm.amountPaid),
      totalFee: Number(paymentForm.totalFee),
      method: paymentForm.paymentMethod,
      date: todayStr,
    };

    setPayments([newPayment, ...payments]);
    setPaymentForm({ feeType: 'Tuition', amountPaid: '', totalFee: '', paymentMethod: 'Cash' });
    setSelectedStudentId('');
    setActiveTab('registry');
  };

  const handleExpenseSubmit = (e) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) {
      alert('Please specify description and amount.');
      return;
    }

    const newExpense = {
      id: `EXP-${100 + expenses.length + 1}`,
      description: expenseForm.description,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      recipient: expenseForm.recipient || 'N/A',
      date: todayStr,
    };

    setExpenses([newExpense, ...expenses]);
    setExpenseForm({ description: '', category: 'Operational', amount: '', recipient: '' });
    setActiveTab('registry');
  };

  // Receive Payment Student Options Filter Logic
const eligibleStudentsForPayment = registeredStudents.filter((s) => {
  // Normalize student department/section matching
  const studentDept = (s.department || s.section || '').trim();
 const matchSection = !paySection || 
      studentDept.toLowerCase() === paySection.toLowerCase() ||
      (paySection.toLowerCase().includes('technical') && studentDept.toLowerCase().includes('technical'));

  const studentClass = (s.class || s.classLevel || '').trim();
  const matchClass = !payClassLevel || studentClass.toLowerCase() === payClassLevel.toLowerCase();

  const studentTrade = (s.trade || s.trades_series || '').trim();
  const matchTrade = !payTrade || studentTrade.toLowerCase() === payTrade.toLowerCase();

  return matchSection && matchClass && matchTrade;
});

// Fee Registry Table Filter Logic
const filteredRegistryPayments = payments.filter((p) => {
  const matchesSearch =
    !searchQuery ||
    p.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.class?.toLowerCase().includes(searchQuery.toLowerCase());

  const dept = (p.department || p.section || '').trim();
  const matchesSection = !regSection || 
    dept.toLowerCase() === regSection.toLowerCase() ||
    (regSection.toLowerCase().includes('technical') && dept.toLowerCase().includes('technical'));

  const cls = (p.class || p.classLevel || '').trim();
  const matchesClass = !regClassLevel || cls.toLowerCase() === regClassLevel.toLowerCase();

  const trd = (p.trade || p.trades_series || '').trim();
  const matchesTrade = !regTrade || trd.toLowerCase() === regTrade.toLowerCase();

  const matchesId = !regStudentId || p.studentId?.toLowerCase().includes(regStudentId.trim().toLowerCase());

  return matchesSearch && matchesSection && matchesClass && matchesTrade && matchesId;
});

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="bg-[#1b4332] text-white px-6 py-6 shadow-md">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-inner">
              NR
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">NsuhRecords</h1>
              <p className="text-xs text-emerald-200 font-medium">
                Wisdom College — Financial Records Management (2026 - 2027)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-emerald-100">Welcome, Mankah Mary (Bursar)</p>
              <p className="text-[11px] text-emerald-300">{formattedDate}</p>
            </div>
            <a
              href="/"
              className="text-xs font-semibold px-4 py-2 bg-[#2d6a4f] hover:bg-[#40916c] text-white rounded-lg transition border border-emerald-600/50"
            >
              Exit Portal
            </a>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full space-y-6">
        
        {/* Aggregation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
              Today's Revenue
            </span>
            <h3 className="text-2xl font-black text-stone-800 mt-3">
              {todaysRevenue.toLocaleString()} <span className="text-xs text-stone-500 font-normal">XAF</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-1">Live payments recorded today</p>
          </div>

          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-1 rounded-md">
              Today's Expenses
            </span>
            <h3 className="text-2xl font-black text-stone-800 mt-3">
              {todaysExpenses.toLocaleString()} <span className="text-xs text-stone-500 font-normal">XAF</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-1">Disbursements logged today</p>
          </div>

          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-1 rounded-md">
              Tuition Registry
            </span>
            <h3 className="text-2xl font-black text-stone-800 mt-3">
              {totalTuitionCollected.toLocaleString()} <span className="text-xs text-stone-500 font-normal">XAF</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-1">Cumulated tuition collection</p>
          </div>

          <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md">
              Other Revenues
            </span>
            <h3 className="text-2xl font-black text-stone-800 mt-3">
              {totalOtherRevenue.toLocaleString()} <span className="text-xs text-stone-500 font-normal">XAF</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-1">PTA, GCE, Uniforms & Badges</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="bg-white border border-stone-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'registry' ? 'bg-[#1b4332] text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Fee Registry Table
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'receive' ? 'bg-[#1b4332] text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              [ + ] Receive Payment
            </button>
            <button
              onClick={() => setActiveTab('expense')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'expense' ? 'bg-[#1b4332] text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              [ - ] Record Expense / Disbursements
            </button>
            {/* NEW TAB: Ancillary Revenue */}
          <button
            onClick={() => setActiveTab('ancillary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ancillary' ? 'bg-[#1b4332] text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            [ + ] Ancillary Revenue
          </button>

          {/* TAB 5: FINANCIAL AUDIT & REPORTS */}
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'reports' ? 'bg-[#1b4332] text-white shadow-md' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              [ 📊 ] Financial Audit & Reports
            </button>
            {/* TAB 6: CLASS FEE SETTINGS BUTTON */}
  <button
    onClick={() => setActiveTab('fee-setup')}
    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
      activeTab === 'fee-setup'
        ? 'bg-[#1b4332] text-white shadow-md'
        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
    }`}
  >
    ⚙️ Class Fee Settings
  </button>
          </div>

          {activeTab === 'registry' && (
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Quick Search Name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}
        </div>

        {/* --- TAB 1: FEE REGISTRY TABLE --- */}
        {activeTab === 'registry' && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6">
            
            {/* EMBEDDED FILTER FOR REGISTRY */}
<div className="bg-[#FDFBF7] border border-stone-200 rounded-xl p-4 space-y-3">
  <div className="flex justify-between items-center">
    <span className="text-xs font-bold text-[#1b4332] uppercase tracking-wider">
      🔍 Filter Financial Records
    </span>
    <button
      onClick={() => {
        setRegSection('');
        setRegClassLevel('');
        setRegTrade('');
        setRegStudentId('');
      }}
      className="text-xs text-emerald-700 font-semibold hover:underline"
    >
      Clear Filters
    </button>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
    {/* 1. SECTION */}
    <div>
      <label className="block text-[11px] font-bold text-stone-600 mb-1">Section</label>
      <select
        value={regSection}
        onChange={(e) => {
          setRegSection(e.target.value);
          setRegClassLevel('');
          setRegTrade('');
        }}
        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
      >
        <option value="">All Sections</option>
        <option value="General Education">General Education</option>
        <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
        <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
      </select>
    </div>

   {/* 2. CLASS LEVEL */}
        <div>
          <label className="block text-[11px] font-bold text-stone-600 mb-1">Class Level</label>
          <select
            value={regClassLevel}
            onChange={(e) => {
              setRegClassLevel(e.target.value);
              setRegTrade(''); // Reset series/trade on class change
            }}
            disabled={!regSection}
            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 disabled:bg-stone-100"
          >
            <option value="">All Classes</option>
            {regSection === 'General Education' && 
              GENERAL_CLASSES_CATALOG.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))
            }
            {regSection === 'Technical Commercial (STT)' && 
              TECHNICAL_COMMERCIAL_CATALOG.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))
            }
            {regSection === 'Technical Industrial (IND)' && 
              TECHNICAL_INDUSTRIAL_CATALOG.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))
            }
          </select>
        </div>

        {/* 3. TRADE / SERIES */}
        <div>
          <label className="block text-[11px] font-bold text-stone-600 mb-1">Trade / Series</label>
          <select
            value={regTrade}
            onChange={(e) => setRegTrade(e.target.value)}
            disabled={
              !regSection || 
              (regSection === 'General Education' && GENERAL_LOWER_CLASSES.includes(regClassLevel))
            }
            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 disabled:bg-stone-100"
          >
            <option value="">All Trades / Series</option>
            
            {/* General High School Series (L6A, L6S, U6A, U6S, etc.) */}
            {regSection === 'General Education' && regClassLevel.includes('Arts') &&
              (GENERAL_SERIES_CATALOG.series?.ARTS || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))
            }
            {regSection === 'General Education' && regClassLevel.includes('Science') &&
              (GENERAL_SERIES_CATALOG.series?.SCIENCE || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))
            }

            {/* Technical Commercial Trades */}
            {regSection === 'Technical Commercial (STT)' &&
              COMMERCIAL_TRADE_SERIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))
            }

            {/* Technical Industrial Trades */}
            {regSection === 'Technical Industrial (IND)' &&
              INDUSTRIAL_TRADE_SERIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))
            }
          </select>
        </div>

    {/* 4. STUDENT UNIQUE ID / NAME SEARCH */}
    <div>
      <label className="block text-[11px] font-bold text-stone-600 mb-1">Student Search</label>
      <input
        type="text"
        placeholder="Search ID or Name..."
        value={regStudentId}
        onChange={(e) => setRegStudentId(e.target.value)}
        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
      />
    </div>
  </div>
</div>
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#1b4332]">Live School Fee & Financial Registry</h2>
                <p className="text-xs text-stone-500">Showing verified student transaction records</p>
              </div>
              <button
                onClick={() => alert('Downloading official NsuhRecords Financial Statement PDF...')}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-semibold transition"
              >
                Download Financial Statement
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-[#1b4332] text-white font-semibold">
                  <tr>
                    <th className="p-3.5 rounded-l-xl">Receipt ID</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Unique ID</th>
                    <th className="p-3.5">Dept / Class</th>
                    <th className="p-3.5">Trade / Specialty</th>
                    <th className="p-3.5">Fee Category</th>
                    <th className="p-3.5">Paid / Total</th>
                    <th className="p-3.5">Balance</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 rounded-r-xl">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                 {loadingStudents ? (
  <tr>
    <td colSpan="10" className="p-6 text-center text-stone-500 font-medium text-xs">
      Loading live student records from All Students List...
    </td>
  </tr>
) : filteredRegistryPayments.length === 0 ? (
  <tr>
    <td colSpan="10" className="p-6 text-center text-stone-500 font-medium text-xs">
      No student records found matching your active filter choices.
    </td>
  </tr>
) : (
  filteredRegistryPayments.map((payment) => {
    // Payment defaults (0.00 / 0 XAF until fee records are linked)
    const amountPaid = payment.amountPaid || 0;
    const totalFee = payment.totalFee || 0;
    const balance = totalFee - amountPaid;
    const isComplete = totalFee > 0 && balance <= 0;
    const receiptId = student.unique_code ? `REC-${student.unique_code.slice(-6)}` : 'N/A';
    const todayDate = new Date().toISOString().split('T')[0];

    return (
      <tr key={student.id || student.unique_code} className="hover:bg-stone-50 transition">
        {/* Receipt ID */}
        <td className="p-3.5 font-mono font-bold text-emerald-800">
          {receiptId}
        </td>

        {/* Student Name */}
        <td className="p-3.5 font-bold text-stone-900">
          {student.fullName || 'N/A'}
        </td>

        {/* Unique ID */}
        <td className="p-3.5 font-mono uppercase text-stone-500">
          {student.unique_code || 'N/A'}
        </td>

        {/* Dept / Class */}
        <td className="p-3.5">
          <span className="text-stone-800 font-medium">{student.classLevel || 'N/A'}</span>
          <span className="text-[10px] block text-stone-500">
            {student.section || 'General Education'} • {student.academicYear || '2025/2026'}
          </span>
        </td>

        {/* Trade / Specialty */}
        <td className="p-3.5 text-stone-600">
          {student.trades_series || student.trade || 'N/A'}
        </td>

        {/* Fee Category */}
        <td className="p-3.5 font-medium text-stone-700">
          Tuition
        </td>

        {/* Paid / Total */}
        <td className="p-3.5 font-semibold text-stone-900">
          {amountPaid.toLocaleString()} / {totalFee.toLocaleString()} XAF
        </td>

        {/* Balance */}
        <td className="p-3.5 font-mono text-rose-700 font-bold">
          {balance > 0 ? `${balance.toLocaleString()} XAF` : '0 XAF'}
        </td>

        {/* Status */}
        <td className="p-3.5">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isComplete 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {isComplete ? 'Complete' : 'Pending'}
          </span>
        </td>

        {/* Date */}
        <td className="p-3.5 text-stone-500 font-mono">
          {student.created_at ? new Date(student.created_at).toISOString().split('T')[0] : todayDate}
        </td>
      </tr>
    );
  })
)}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2: RECEIVE PAYMENT FORM WITH FILTER LOGIC --- */}
        {activeTab === 'receive' && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#1b4332]">Post Student Fee Payment</h2>
              <p className="text-xs text-stone-500">Filter and select an officially registered student to record payment</p>
            </div>

            {/* CASCADING FILTER INTEGRATED IN PAYMENT VIEW */}
            <div className="bg-[#FDFBF7] border border-stone-200 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-[#1b4332] uppercase tracking-wider">
                Step 1: Filter & Select Enrolled Student
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  {/* 1. SECTION */}
  <div>
    <label className="block text-[11px] font-bold text-stone-600 mb-1">Section *</label>
    <select
      value={paySection}
      onChange={(e) => {
        setPaySection(e.target.value);
        setPayClassLevel('');
        setPayTrade('');
        setSelectedStudentId('');
      }}
      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
    >
      <option value="">-- All Sections --</option>
      <option value="General Education">General Education</option>
      <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
      <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
    </select>
  </div>

  {/* 2. CLASS LEVEL */}
  <div>
    <label className="block text-[11px] font-bold text-stone-600 mb-1">Class Level *</label>
    <select
      value={payClassLevel}
      onChange={(e) => {
        setPayClassLevel(e.target.value);
        setSelectedStudentId('');
      }}
      disabled={!paySection}
      className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 disabled:bg-stone-100 disabled:text-stone-400 focus:ring-1 focus:ring-emerald-700 focus:outline-none"
    >
      <option value="">-- Select Class Level --</option>
      {paySection === 'General Education' && generalClasses.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
      {(paySection === 'Technical Commercial (STT)' || paySection === 'Technical Industrial (IND)') && technicalClasses.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  </div>

  {/* 3. TRADE / SERIES */}
        <div>
          <label className="block text-[11px] font-bold text-stone-600 mb-1">Trade / Series</label>
          <select
            value={payTrade}
            onChange={(e) => {
              setPayTrade(e.target.value);
              setSelectedStudentId('');
            }}
            disabled={
              !paySection || 
              (paySection === 'General Education' && GENERAL_LOWER_CLASSES.includes(payClassLevel))
            }
            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 disabled:bg-stone-100"
          >
            <option value="">-- Select Trade / Series --</option>

            {/* General High School Series */}
            {paySection === 'General Education' && payClassLevel.includes('Arts') &&
              (GENERAL_SERIES_CATALOG.series?.ARTS || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))
            }
            {paySection === 'General Education' && payClassLevel.includes('Science') &&
              (GENERAL_SERIES_CATALOG.series?.SCIENCE || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))
            }

            {/* Technical Commercial Trades */}
            {paySection === 'Technical Commercial (STT)' &&
              COMMERCIAL_TRADE_SERIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))
            }

            {/* Technical Industrial Trades */}
            {paySection === 'Technical Industrial (IND)' &&
              INDUSTRIAL_TRADE_SERIES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))
            }
          </select>
        </div>
</div>

              {/* Student Dropdown auto-populated by filter */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Select Student *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold text-stone-800 focus:outline-none focus:border-emerald-600"
                >
                 <option value="">-- Click to Select Student from Filtered List --</option>
{eligibleStudentsForPayment.map((st) => (
  <option key={st.id} value={st.id}>
    {st.name} ({st.id}) - {st.class} {st.trade || st.trades_series ? `(${st.trade || st.trades_series})` : ''}
  </option>
))}
                </select>
              </div>
            </div>

            {/* STEP 2: PAYMENT ENTRY FORM */}
            <form onSubmit={handlePaymentSubmit} className="space-y-4 border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold text-[#1b4332] uppercase tracking-wider">
                Step 2: Payment Details
              </h3>

              {activeStudentObj && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{activeStudentObj.name} ({activeStudentObj.id})</p>
                    <p className="text-[11px] text-emerald-700">{activeStudentObj.department} — {activeStudentObj.class} ({activeStudentObj.trade})</p>
                  </div>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded">Verified Student</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Fee Type *</label>
                  <select
                    value={paymentForm.feeType}
                    onChange={(e) => setPaymentForm({ ...paymentForm, feeType: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Tuition">Tuition / School Fees</option>
                    <option value="Registration">Registration Fee</option>
                    <option value="PTA">PTA Contribution</option>
                    <option value="Transport">Transport Fee</option>
                    <option value="GCE Registration">GCE Registration</option>
                    <option value="Examination">Examination Fee</option>
                    <option value="Uniform">Uniform & Badge</option>
                    <option value="Other">Other Contribution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Cash">Cash Handed</option>
                    <option value="MoMo">MTN Mobile Money</option>
                    <option value="Orange Money">Orange Money</option>
                    <option value="Bank Transfer">Bank Transfer / Deposit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Amount Paid (XAF) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={paymentForm.amountPaid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Total Fee Expected *</label>
                  <input
                    type="number"
                    placeholder="e.g. 60000"
                    value={paymentForm.totalFee}
                    onChange={(e) => setPaymentForm({ ...paymentForm, totalFee: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={!activeStudentObj}
                  className="flex-1 bg-[#1b4332] hover:bg-[#2d6a4f] disabled:bg-stone-300 text-white font-bold py-3 rounded-xl text-sm transition shadow-md"
                >
                  Post Payment & Issue Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('registry')}
                  className="px-5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold py-3 rounded-xl text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- TAB 3: EXPENSE REGISTRY TABLE & DISBURSEMENT LOG --- */}
        {activeTab === 'expense' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Record Expense Form */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm lg:col-span-1 space-y-4">
              <h2 className="text-base font-bold text-[#1b4332]">Record New Expense</h2>
              <p className="text-xs text-stone-500">Log administrative disbursements</p>

              <form onSubmit={handleExpenseSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Description *</label>
                  <input
                    type="text"
                    placeholder="e.g. Office Stationery"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="Operational">Classroom & Operational</option>
                    <option value="Utilities">Utilities (Water/Electricity)</option>
                    <option value="Maintenance">Maintenance & Repairs</option>
                    <option value="Transport">Staff Transportation</option>
                    <option value="Other">Other Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Amount Spent (XAF) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Vendor / Recipient</label>
                  <input
                    type="text"
                    placeholder="e.g. Local Station"
                    value={expenseForm.recipient}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recipient: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md mt-2"
                >
                  Log Disbursement Entry
                </button>
              </form>
            </div>

            {/* Expense Registry Table */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
              <h2 className="text-base font-bold text-[#1b4332]">School Expense Ledger</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-[#1b4332] text-white font-semibold">
                    <tr>
                      <th className="p-3 rounded-l-xl">Exp ID</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3 rounded-r-xl">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-stone-50 transition">
                        <td className="p-3 font-mono font-bold text-rose-800">{exp.id}</td>
                        <td className="p-3 font-semibold text-stone-900">{exp.description}</td>
                        <td className="p-3 text-stone-600">{exp.category}</td>
                        <td className="p-3 text-stone-600">{exp.recipient}</td>
                        <td className="p-3 font-mono font-bold text-rose-700">
                          {exp.amount.toLocaleString()} XAF
                        </td>
                        <td className="p-3 text-stone-500 font-mono">{exp.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      {/* TAB 4: ANCILLARY REVENUE & OTHER SOURCES */}
      {activeTab === 'ancillary' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm lg:col-span-1 space-y-4">
            <h2 className="text-base font-bold text-[#1b4332]">Record Ancillary Revenue</h2>
            <p className="text-xs text-stone-500">Log PTA levies, exam fees, donations, and custom funds.</p>

            <form onSubmit={handleAddAncillary} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Category *</label>
                <select
                  value={ancillaryForm.category}
                  onChange={(e) => setAncillaryForm({ ...ancillaryForm, category: e.target.value })}
                  className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800"
                >
                  <option value="PTA Levy">PTA Levy</option>
                  <option value="Uniform / Badge">Uniform / Badge</option>
                  <option value="Motive / Exam Fee">Motive / Exam Fee</option>
                  <option value="ID Card Replacement">ID Card Replacement</option>
                  <option value="Custom / Other">Custom / Other</option>
                </select>
              </div>

              {ancillaryForm.category === 'Custom / Other' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Custom Category Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Hall Rental"
                    value={ancillaryForm.customCategory}
                    onChange={(e) => setAncillaryForm({ ...ancillaryForm, customCategory: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Description *</label>
                <input
                  type="text"
                  placeholder="e.g. PTA Annual Contribution"
                  value={ancillaryForm.description}
                  onChange={(e) => setAncillaryForm({ ...ancillaryForm, description: e.target.value })}
                  className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Amount (XAF) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={ancillaryForm.amount}
                    onChange={(e) => setAncillaryForm({ ...ancillaryForm, amount: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={ancillaryForm.date}
                    onChange={(e) => setAncillaryForm({ ...ancillaryForm, date: e.target.value })}
                    className="w-full bg-[#FDFBF7] border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                + Save Ancillary Entry
              </button>
            </form>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-[#1b4332]">Ancillary Revenue Log</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-[#1b4332] text-white font-semibold">
                  <tr>
                    <th className="p-3 rounded-l-xl">Category</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3 rounded-r-xl">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {otherRevenues.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-stone-400">
                        No ancillary revenue entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    otherRevenues.map((rev) => (
                      <tr key={rev.id} className="hover:bg-stone-50 transition">
                        <td className="p-3 font-semibold text-stone-800">{rev.category}</td>
                        <td className="p-3">{rev.description}</td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {rev.amount.toLocaleString()} XAF
                        </td>
                        <td className="p-3 font-mono text-stone-500">{rev.date || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}  
{/* TAB 5: FINANCIAL AUDIT & REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base font-bold text-[#1b4332]">Financial Summary & Balance Audit</h2>
                <p className="text-xs text-stone-500">Real-time aggregate cash flow analytics for the institution.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-4 py-2 rounded-xl text-xs transition"
              >
                🖨️ Print Financial Statement
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#FDFBF7] border border-stone-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-stone-500">Total Income (Fees + Ancillary)</p>
                <p className="text-xl font-black text-emerald-700 font-mono mt-1">
                  {(
                    payments.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0) +
                    otherRevenues.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
                  ).toLocaleString()} XAF
                </p>
              </div>

              <div className="bg-[#FDFBF7] border border-stone-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-stone-500">Total Operational Expenses</p>
                <p className="text-xl font-black text-rose-700 font-mono mt-1">
                  {expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString()} XAF
                </p>
              </div>

              <div className="bg-[#FDFBF7] border border-stone-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-stone-500">Net Liquid Treasury Balance</p>
                <p className="text-xl font-black text-[#1b4332] font-mono mt-1">
                  {(
                    payments.reduce((acc, curr) => acc + (Number(curr.amountPaid) || 0), 0) +
                    otherRevenues.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) -
                    expenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
                  ).toLocaleString()} XAF
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* TAB 6: CLASS FEE SETTINGS CONTENT */}
      {activeTab === 'fee-setup' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#1b4332]">Class Fee Configuration</h2>
            <p className="text-xs text-stone-500">Define baseline expected tuition & fee amounts per section, level, and trade/series.</p>
          </div>

          {/* Section / Class / Trade Selector Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FDFBF7] p-4 rounded-xl border border-stone-200">
            <div>
              <label className="block text-[11px] font-bold text-stone-600 mb-1">Section</label>
              <select
                 value={feeSetupForm.section}
            onChange={(e) => {
              setFeeSetupForm({
                ...feeSetupForm,
                section: e.target.value,
                classLevel: '',
                trade: ''
              });
            }}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                >
                  <option value="">Select Section...</option>
                  <option value="General Education">General Education</option>
                  <option value="Technical Commercial (STT)">Technical Commercial (STT)</option>
                  <option value="Technical Industrial (IND)">Technical Industrial (IND)</option>
                </select>
            </div>

            <div>
             {/* Dynamic Class Level Selector */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Class Level</label>
                <select
                  value={feeSetupForm.classLevel}
                  disabled={!feeSetupForm.section}
                  onChange={(e) => {
              const selectedClass = e.target.value;
              const isGeneralLower = feeSetupForm.section === 'General Education' && GENERAL_LOWER_CLASSES?.includes(selectedClass);
              
              setFeeSetupForm({
                ...feeSetupForm,
                classLevel: selectedClass,
                trade: isGeneralLower ? 'N/A' : ''
              });
            }}
                  className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 disabled:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
                >
                  <option value="">Select Class...</option>
                  {getFeeClasses().map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic Trade / Series Selector */}
              <div>
          <label className="block text-[11px] font-bold text-stone-600 mb-1">Trade / Series</label>
          <select
            value={feeSetupForm.trade || ''}
            disabled={!feeSetupForm.classLevel}
            onChange={(e) => setFeeSetupForm({ ...feeSetupForm, trade: e.target.value })}
            className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none disabled:bg-stone-100 disabled:text-stone-400"
          >
            <option value="">Select Trade / Series...</option>
            {Array.isArray(getFeeSeries()) && getFeeSeries().map((trd) => (
              <option key={trd} value={trd}>{trd}</option>
            ))}
          </select>
        </div>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-stone-200 flex flex-col items-center justify-center space-y-1 bg-white">
        <p className="text-xs text-stone-500">&copy; {new Date().getFullYear()} NsuhRecords. All rights reserved.</p>
        <p className="text-[10px] text-stone-400 font-mono">App conceived by Norbert Che Nsuh - 682491189</p>
      </footer>
    </div>
  );
}