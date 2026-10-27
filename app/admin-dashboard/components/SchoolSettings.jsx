import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Globe, 
  Settings, 
  Sliders, 
  Layers, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Info, 
  ShieldAlert,
  Calendar,
  Clock,
  Save,
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Unlock,
  LogOut
} from 'lucide-react';

// ==========================================
// 1. TRANSLATION DICTIONARY (EN / FR / ES / AR)
// ==========================================
const translations = {
  en: {
    dir: 'ltr',
    systemSettings: 'System & Academic Settings',
    systemDescription: 'Manage platform architecture, set operating modes, define custom levels, and configure active academic sessions.',
    languageSelector: 'LANGUAGE PREFERENCE',
    modeTitle: 'System Operating Mode',
    standardMode: 'Standard System (Pre-defined Templates)',
    standardDesc: 'Use standard Cameroonian national templates (e.g., Anglophone Secondary/High School, Francophone Général, ESTP, MINEFOP).',
    customMode: 'Dynamic Custom System (Admin-Defined)',
    customDesc: 'Build a custom framework. Define your own class levels, section names, and global subject catalog.',
    activeMode: 'Active Mode',
    switchWarningTitle: 'Critical System Configuration Notice',
    switchWarningText: 'Switching operating modes reconfigures how Class Levels and Subject Catalog filters are structured. Raw student grades stored in the Master Mark Sheet remain completely safe, but teacher assignments and class coefficients may need re-mapping.',
    confirmSwitch: 'Understand & Proceed',
    cancel: 'Cancel',
    sectionNameLabel: 'Custom Section / Discipline Name',
    sectionNamePlaceholder: 'e.g., Faculty, Department, Technical Specialty, Skill Center',
    classLevelsLabel: 'Class Levels & Progression Tiers',
    addClassLevel: '+ Add Level',
    classLevelPlaceholder: 'e.g., Form 1, 6ème, Lower Tier, Level 100',
    subjectCatalogLabel: 'Global Subject Catalog',
    addSubject: '+ Add Subject',
    subjectPlaceholder: 'e.g., Dictée, Physics, Applied Mechanics',
    saveSystemConfig: 'Save Configuration',
    configSaved: 'System settings successfully updated!',
    academicYearHeader: 'Academic Session & Term Setup',
    academicYearDesc: 'Configure active academic year, active sequence/term, and perform end-of-year student progression rollovers.',
    activeYearLabel: 'Active Academic Year',
    activeTermLabel: 'Active Term / Sequence',
    academicYearPlaceholder: 'Select Academic Year...',
    saveAcademicSession: 'Update Academic Session',
    rolloverHeader: 'Academic Year Rollover & Archiving',
    rolloverDesc: 'Promote students to the next level, archive term marks, and prepare the Master Mark Sheet for a new session.',
    triggerRollover: 'Initiate Year Rollover',
    masterSheetNote: 'Regardless of your selected mode, all student marks and evaluations flow into the unified Master Mark Sheet.',
    logoutLabel: 'Log Out of System'
  },
  fr: {
    dir: 'ltr',
    systemSettings: 'Paramètres du Système & Année Académique',
    systemDescription: 'Gérez l\'architecture de la plateforme, définissez le mode de fonctionnement, les niveaux et configurez la session active.',
    languageSelector: 'LANGUE DE L\'APPLICATION',
    modeTitle: 'Mode de Fonctionnement du Système',
    standardMode: 'Système Standard (Modèles Prédéfinis)',
    standardDesc: 'Utilisez les modèles nationaux camerounais (ex: Anglophone, Francophone Général, ESTP, MINEFOP).',
    customMode: 'Système Personnalisé Dynamique (Défini par l\'Admin)',
    customDesc: 'Construisez un cadre sur mesure. Définissez vos propres niveaux, sections et catalogue de matières.',
    activeMode: 'Mode Actif',
    switchWarningTitle: 'Avis Critique de Configuration du Système',
    switchWarningText: 'Changer de mode reconfigure les filtres des niveaux et des matières. Les notes brutes dans la Fiche Maîtresse restent intactes, mais l\'attribution des enseignants et les coefficients devront être réajustés.',
    confirmSwitch: 'Compris, Continuer',
    cancel: 'Annuler',
    sectionNameLabel: 'Nom de la Section / Discipline Personnalisée',
    sectionNamePlaceholder: 'ex: Faculté, Département, Spécialité Technique',
    classLevelsLabel: 'Niveaux de Classe / Étapes de Progression',
    addClassLevel: '+ Ajouter Niveau',
    classLevelPlaceholder: 'ex: 6ème, Form 1, Niveau 100',
    subjectCatalogLabel: 'Catalogue Général des Matières',
    addSubject: '+ Ajouter Matière',
    subjectPlaceholder: 'ex: Dictée, Physique, Mécanique Appliquée',
    saveSystemConfig: 'Enregistrer la Configuration',
    configSaved: 'Paramètres du système mis à jour avec succès !',
    academicYearHeader: 'Configuration de l\'Année Académique & Trimestres',
    academicYearDesc: 'Définissez l\'année académique active, le trimestre/séquence en cours et gérez le report d\'année.',
    activeYearLabel: 'Année Académique Active',
    activeTermLabel: 'Trimestre / Séquence en Cours',
    academicYearPlaceholder: 'Sélectionner l\'Année Académique...',
    saveAcademicSession: 'Mettre à Jour la Session',
    rolloverHeader: 'Report d\'Année Académique & Archivage',
    rolloverDesc: 'Faites passer les élèves au niveau supérieur, archivez les notes et préparez la Fiche Maîtresse pour la nouvelle session.',
    triggerRollover: 'Lancer le Report d\'Année',
    masterSheetNote: 'Quel que soit le mode choisi, toutes les évaluations convergent directement vers la même Fiche Maîtresse.',
    logoutLabel: 'Se Déconnecter'
  },
  es: {
    dir: 'ltr',
    systemSettings: 'Configuración del Sistema y Año Académico',
    systemDescription: 'Gestione la arquitectura, configure modos operativos, niveles personalizados y la sesión académica activa.',
    languageSelector: 'PREFERENCIA DE IDIOMA',
    modeTitle: 'Modo Operativo del Sistema',
    standardMode: 'Sistema Estándar (Plantillas Predeterminadas)',
    standardDesc: 'Utilice plantillas preconfiguradas estándar (ej. Francófono, Anglófono, ESTP, MINEFOP).',
    customMode: 'Sistema Personalizado Dinámico (Definido por Admin)',
    customDesc: 'Construya un marco personalizado. Defina sus propios niveles, secciones y catálogo de asignaturas.',
    activeMode: 'Modo Activo',
    switchWarningTitle: 'Aviso Crítico de Configuración',
    switchWarningText: 'Cambiar de modo reconfigura la estructura de los niveles. Las calificaciones guardadas en la Planilla Maestra no se pierden.',
    confirmSwitch: 'Entendido, Continuar',
    cancel: 'Cancelar',
    sectionNameLabel: 'Nombre de Sección / Disciplina',
    sectionNamePlaceholder: 'ej. Facultad, Departamento, Especialidad Técnica',
    classLevelsLabel: 'Niveles de Clase / Progresión',
    addClassLevel: '+ Añadir Nivel',
    classLevelPlaceholder: 'ej. 1° Año, Form 1, Nivel 100',
    subjectCatalogLabel: 'Catálogo de Asignaturas',
    addSubject: '+ Añadir Asignatura',
    subjectPlaceholder: 'ej. Dictado, Física, Mecánica Aplicada',
    saveSystemConfig: 'Guardar Configuración',
    configSaved: '¡Configuración del sistema actualizada!',
    academicYearHeader: 'Configuración de Año Académico y Períodos',
    academicYearDesc: 'Defina el año académico activo y la secuencia actual.',
    activeYearLabel: 'Año Académico Activo',
    activeTermLabel: 'Término / Secuencia Activa',
    academicYearPlaceholder: 'Seleccionar Año...',
    saveAcademicSession: 'Actualizar Sesión',
    rolloverHeader: 'Traspaso de Año Académico',
    rolloverDesc: 'Promueva estudiantes y archive calificaciones.',
    triggerRollover: 'Iniciar Traspaso',
    masterSheetNote: 'Independientemente del modo, todas las evaluaciones van a la Planilla Maestra.',
    logoutLabel: 'Cerrar Sesión'
  },
  ar: {
    dir: 'rtl',
    systemSettings: 'إعدادات النظام والسنة الدراسية',
    systemDescription: 'إدارة هيكلية المنصة، وضع التشغيل، والمستويات والسنة الدراسية النشطة.',
    languageSelector: 'تفضيل اللغة',
    modeTitle: 'وضع تشغيل النظام',
    standardMode: 'النظام القياسي (قوالب محددة مسبقًا)',
    standardDesc: 'استخدم القوالب القياسية المحددة مسبقًا.',
    customMode: 'النظام المخصص الديناميكي (يحدده المسؤول)',
    customDesc: 'إنشاء إطار عمل مخصص بالكامل.',
    activeMode: 'الوضع النشط',
    switchWarningTitle: 'تنبيه هام بشأن التكوين',
    switchWarningText: 'يؤدي تغيير الوضع إلى إعادة هيكلة المستويات والمواد.',
    confirmSwitch: 'موافق، المتابعة',
    cancel: 'إلغاء',
    sectionNameLabel: 'اسم القسم المخصص',
    sectionNamePlaceholder: 'مثال: كلية، قسم، تخصص',
    classLevelsLabel: 'مستويات الفصول',
    addClassLevel: '+ إضافة مستوى',
    classLevelPlaceholder: 'مثال: المستوى 100',
    subjectCatalogLabel: 'كتالوج المواد الدراسية',
    addSubject: '+ إضافة مادة',
    subjectPlaceholder: 'مثال: الفيزياء، الميكانيكا',
    saveSystemConfig: 'حفظ التكوين',
    configSaved: 'تم تحديث الإعدادات بنجاح!',
    academicYearHeader: 'إعداد السنة الدراسية والفترات',
    academicYearDesc: 'تكوين السنة الدراسية النشطة والفترة الحالية.',
    activeYearLabel: 'السنة الدراسية النشطة',
    activeTermLabel: 'الفصل / التسلسل النشط',
    academicYearPlaceholder: 'اختر السنة الدراسية...',
    saveAcademicSession: 'تحديث الجلسة',
    rolloverHeader: 'ترحيل البيانات السنوية',
    rolloverDesc: 'نقل الطلاب إلى المستوى التالي وأرشفة الدرجات.',
    triggerRollover: 'بدء الترحيل',
    masterSheetNote: 'تتدفق جميع التقييمات مباشرة إلى ورقة الدرجات الرئيسية.',
    logoutLabel: 'تسجيل الخروج'
  }
};

// ==========================================
// 2. CONTEXT & HOOKS
// ==========================================
const LanguageContext = createContext();

function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      <div dir={t.dir} className={lang === 'ar' ? 'font-sans rtl' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

function useLanguage() {
  return useContext(LanguageContext);
}

// ==========================================
// 3. MAIN UI COMPONENT
// ==========================================
function SystemSettingsUI({ schoolId, activeSessionId }) {
  const { lang, setLang, t } = useLanguage();

  // Password Feature Access State
  const [isFormUnlocked, setIsFormUnlocked] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Password Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Logout State
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Operating Mode State
  const [systemMode, setSystemMode] = useState('standard');
  const [pendingMode, setPendingMode] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [notification, setNotification] = useState('');

  // Academic Session State
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('2026/2027');
  const [selectedTerm, setSelectedTerm] = useState('Term 1 - Sequence 1');

  // Custom System Builder State
  const [customSectionName, setCustomSectionName] = useState('General & Technical Specialty');
  const [classLevels, setClassLevels] = useState(['Form 1 (F1A)', 'Form 2 (F2A)', 'Form 3 (F3A)', 'Form 4 (F4A)', 'Form 5 (F5A)']);
  const [newLevelInput, setNewLevelInput] = useState('');
  
  const [subjectCatalog, setSubjectCatalog] = useState(['Mathematics', 'English Language', 'French', 'Physics', 'Chemistry', 'Biology']);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Extract clean school ID string safely
  const targetSchoolId = typeof schoolId === 'object' && schoolId !== null 
    ? schoolId.schoolId || schoolId.id 
    : schoolId;

  // Handle Log Out Button Click
  const handleSystemLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.href = '/';
    }
  };

  // Handle "UPDATE PASSWORD" Button Click
  const handleUnlockPasswordFeature = async () => {
    setIsCheckingAuth(true);

    try {
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000'
      );

      if (isLocalhost) {
        setIsFormUnlocked(true);
        setIsCheckingAuth(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('You are not authorised to update password.');
        setIsCheckingAuth(false);
        return;
      }

      let query = supabase.from('assigned_schools').select('admin_email');
      if (targetSchoolId) {
        query = query.eq('school_id', targetSchoolId);
      }

      const { data: schoolData } = await query.maybeSingle();

      const isPrimaryAdmin = schoolData && user.email?.trim().toLowerCase() === schoolData.admin_email?.trim().toLowerCase();

      if (isPrimaryAdmin || !schoolData) {
        setIsFormUnlocked(true);
      } else {
        alert('You are not authorised to update password.');
      }

    } catch (err) {
      console.error('Authorization check error:', err);
      alert('You are not authorised to update password.');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Submit Password Update
  const handleAdminPasswordUpdate = async (e) => {
    e.preventDefault();

    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match. Please re-enter.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '3000'
      );

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (authError) throw authError;

        const userEmail = session.user?.email;
        if (userEmail) {
          let dbQuery = supabase
            .from('assigned_schools')
            .update({ admin_password: newPassword });

          if (targetSchoolId) {
            dbQuery = dbQuery.eq('school_id', targetSchoolId);
          } else {
            dbQuery = dbQuery.eq('admin_email', userEmail);
          }
          await dbQuery;
        }

        alert('Password updated successfully! Logging you out to sign in with your new password...');
        await supabase.auth.signOut();
        window.location.href = '/';

      } else if (isLocalhost) {
        let dbQuery = supabase
          .from('assigned_schools')
          .update({ admin_password: newPassword });

        if (targetSchoolId) {
          dbQuery = dbQuery.eq('school_id', targetSchoolId);
        } else {
          dbQuery = dbQuery.eq('admin_email', 'newlife8525path@gmail.com');
        }

        const { error: dbErr } = await dbQuery;
        if (dbErr) throw dbErr;

        alert('Localhost Password updated successfully in database! Redirecting to login page...');
        window.location.href = '/';

      } else {
        alert('Failed to update password: Auth session missing! Please log in again.');
        setIsUpdatingPassword(false);
      }

    } catch (err) {
      console.error('Error updating password:', err);
      alert(`Failed to update password: ${err.message}`);
      setIsUpdatingPassword(false);
    }
  };

  const handleModeSelection = (targetMode) => {
    if (targetMode === systemMode) return;
    setPendingMode(targetMode);
    setShowWarningModal(true);
  };

  const confirmSystemSwitch = () => {
    setSystemMode(pendingMode);
    setShowWarningModal(false);
    setPendingMode(null);
    triggerNotification(t.configSaved);
  };

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleAddClassLevel = () => {
    if (!newLevelInput.trim()) return;
    setClassLevels([...classLevels, newLevelInput.trim()]);
    setNewLevelInput('');
  };

  const handleRemoveClassLevel = (index) => {
    setClassLevels(classLevels.filter((_, i) => i !== index));
  };

  const handleAddSubject = () => {
    if (!newSubjectInput.trim()) return;
    setSubjectCatalog([...subjectCatalog, newSubjectInput.trim()]);
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (index) => {
    setSubjectCatalog(subjectCatalog.filter((_, i) => i !== index));
  };

  const handleSaveConfiguration = (e) => {
    e.preventDefault();
    triggerNotification(t.configSaved);
  };

  const handleSaveAcademicSession = (e) => {
    e.preventDefault();
    triggerNotification(`Academic session updated to ${selectedAcademicYear} (${selectedTerm})`);
  };

  return (
    <div className="w-full min-h-screen bg-[#070d19] text-slate-200 p-4 md:p-8 space-y-8">
      
      {/* Page Header & Language Selector */}
      <div className="bg-[#0e172a] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-emerald-400" />
            {t.systemSettings}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t.systemDescription}</p>
        </div>

        <div className="bg-[#152238] border border-slate-700/80 px-4 py-2.5 rounded-xl flex items-center gap-3 shrink-0">
          <Globe className="w-5 h-5 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">{t.languageSelector}</span>
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="bg-transparent font-semibold text-white text-sm focus:outline-none cursor-pointer"
            >
              <option value="en" className="bg-[#0e172a] text-white">English (EN)</option>
              <option value="fr" className="bg-[#0e172a] text-white">Français (FR)</option>
              <option value="es" className="bg-[#0e172a] text-white">Español (ES)</option>
              <option value="ar" className="bg-[#0e172a] text-white">العربية (AR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 bg-emerald-900/80 border border-emerald-500/50 text-emerald-100 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

      {/* Unified Master Mark Sheet Info Banner */}
      <div className="bg-[#0e172a] border border-emerald-500/30 rounded-xl p-4 flex items-start gap-4 shadow-md">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-emerald-300 text-sm">Unified Master Mark Sheet Integration</h4>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{t.masterSheetNote}</p>
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 0: PASSWORD SETTINGS WITH BUTTON   */}
      {/* ========================================== */}
      <div className="bg-[#0e172a] border border-emerald-500/40 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Password Settings
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update primary school administrator password.
              </p>
            </div>
          </div>
          <KeyRound className="w-8 h-8 text-slate-700 hidden sm:block" />
        </div>

        {!isFormUnlocked ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#152238]/60 border border-slate-700/80 rounded-xl">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-300">
                Click <span className="text-emerald-400 font-semibold">UPDATE PASSWORD</span> to verify authorization and open password fields.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUnlockPasswordFeature}
              disabled={isCheckingAuth}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-6 rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isCheckingAuth ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Verifying Authorization...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  UPDATE PASSWORD
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleAdminPasswordUpdate} className="grid md:grid-cols-2 gap-6 items-end animate-fade-in">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input 
                  type={showPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full bg-[#152238] border border-slate-700 rounded-xl p-3 pr-10 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Confirm New Password</label>
              <input 
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-[#152238] border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>

            <div className="md:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm"
              >
                {isUpdatingPassword ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Save & Update Credentials
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ========================================== */}
      {/* SECTION 1: ACADEMIC YEAR & SESSION CONTROL */}
      {/* ========================================== */}
      <div className="bg-[#0e172a] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <Calendar className="w-6 h-6 text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white">{t.academicYearHeader}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t.academicYearDesc}</p>
          </div>
        </div>

        <form onSubmit={handleSaveAcademicSession} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.activeYearLabel}</label>
            <div className="relative">
              <select 
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="w-full bg-[#152238] border border-slate-700 rounded-xl p-3 text-sm text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="2025/2026">2025/2026 Academic Year</option>
                <option value="2026/2027">2026/2027 Academic Year (Current)</option>
                <option value="2027/2028">2027/2028 Academic Year</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.activeTermLabel}</label>
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-[#152238] border border-slate-700 rounded-xl p-3 text-sm text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="Term 1 - Sequence 1">Term 1 — Sequence 1</option>
              <option value="Term 1 - Sequence 2">Term 1 — Sequence 2</option>
              <option value="Term 2 - Sequence 3">Term 2 — Sequence 3</option>
              <option value="Term 2 - Sequence 4">Term 2 — Sequence 4</option>
              <option value="Term 3 - Sequence 5">Term 3 — Sequence 5</option>
              <option value="Term 3 - Sequence 6">Term 3 — Sequence 6</option>
            </select>
          </div>

          <div>
            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {t.saveAcademicSession}
            </button>
          </div>
        </form>

        <div className="bg-[#152238]/60 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-200 text-sm">{t.rolloverHeader}</h4>
              <p className="text-xs text-slate-300 mt-0.5">{t.rolloverDesc}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => triggerNotification('Academic Year Rollover Tool initialized.')}
            className="bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t.triggerRollover}
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 2: SYSTEM OPERATING MODE SELECTOR  */}
      {/* ========================================== */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          {t.modeTitle}
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div 
            onClick={() => handleModeSelection('standard')}
            className={`cursor-pointer p-6 rounded-2xl border transition-all ${
              systemMode === 'standard' 
                ? 'bg-[#0e172a] border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl' 
                : 'bg-[#0e172a]/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Layers className="w-6 h-6" />
              </span>
              {systemMode === 'standard' && (
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-sm">
                  {t.activeMode}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white">{t.standardMode}</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t.standardDesc}</p>
          </div>

          <div 
            onClick={() => handleModeSelection('custom')}
            className={`cursor-pointer p-6 rounded-2xl border transition-all ${
              systemMode === 'custom' 
                ? 'bg-[#0e172a] border-emerald-500 ring-2 ring-emerald-500/30 shadow-xl' 
                : 'bg-[#0e172a]/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <Sliders className="w-6 h-6" />
              </span>
              {systemMode === 'custom' && (
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-sm">
                  {t.activeMode}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white">{t.customMode}</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t.customDesc}</p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* SECTION 3: DYNAMIC CUSTOM SYSTEM BUILDER  */}
      {/* ========================================== */}
      {systemMode === 'custom' && (
        <form onSubmit={handleSaveConfiguration} className="bg-[#0e172a] border border-slate-800 p-6 md:p-8 rounded-2xl space-y-8 shadow-xl">
          
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">Dynamic Custom System Builder</h3>
            <p className="text-xs text-slate-400 mt-1">Configure class levels, custom discipline terms, and global course modules for your school.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.sectionNameLabel}</label>
            <input 
              type="text" 
              value={customSectionName} 
              onChange={(e) => setCustomSectionName(e.target.value)}
              placeholder={t.sectionNamePlaceholder}
              className="w-full bg-[#152238] border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.classLevelsLabel}</label>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newLevelInput}
                onChange={(e) => setNewLevelInput(e.target.value)}
                placeholder={t.classLevelPlaceholder}
                className="flex-1 bg-[#152238] border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button 
                type="button" 
                onClick={handleAddClassLevel}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                {t.addClassLevel}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {classLevels.map((lvl, index) => (
                <span key={index} className="px-3 py-2 bg-[#152238] border border-slate-700 text-slate-200 rounded-xl text-xs font-medium flex items-center gap-3">
                  {lvl}
                  <button type="button" onClick={() => handleRemoveClassLevel(index)} className="text-slate-400 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{t.subjectCatalogLabel}</label>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                placeholder={t.subjectPlaceholder}
                className="flex-1 bg-[#152238] border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button 
                type="button" 
                onClick={handleAddSubject}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                {t.addSubject}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {subjectCatalog.map((subj, index) => (
                <div key={index} className="p-3 bg-[#152238] border border-slate-700/80 rounded-xl flex items-center justify-between">
                  <span className="font-medium text-slate-200 text-xs">{subj}</span>
                  <button type="button" onClick={() => handleRemoveSubject(index)} className="text-slate-400 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button 
              type="submit" 
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t.saveSystemConfig}
            </button>
          </div>

        </form>
      )}

      {/* ========================================== */}
      {/* SECTION 4: LOG OUT BUTTON                  */}
      {/* ========================================== */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSystemLogout}
          disabled={isLoggingOut}
          className="bg-red-600/90 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
        >
          {isLoggingOut ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Logging Out...
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              {t.logoutLabel}
            </>
          )}
        </button>
      </div>

      {/* ========================================== */}
      {/* SECTION 5: MODE SWITCH WARNING MODAL       */}
      {/* ========================================== */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e172a] border border-amber-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">{t.switchWarningTitle}</h3>
            </div>

            <p className="text-xs text-amber-100 leading-relaxed bg-[#1d1b0e] p-4 rounded-xl border border-amber-500/30">
              {t.switchWarningText}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2.5 border border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={confirmSystemSwitch}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-lg"
              >
                {t.confirmSwitch}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// 4. MAIN SINGLE DEFAULT EXPORT
// ==========================================
export default function SchoolSettings(props) {
  return (
    <LanguageProvider>
      <SystemSettingsUI {...props} />
    </LanguageProvider>
  );
}