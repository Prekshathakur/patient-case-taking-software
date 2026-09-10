/**
 * AyurAyush AI - Smart OPD Case-Taking Software
 * Core Application Engine - Complete Faculty Feedback Implementation
 * 1. Password Visibility Toggle & Redaction
 * 2. Cancel Button Routing Protection
 * 3. Interactive Body Map SVG Synchronization
 * 4. Primary Symptoms Boxes Dynamic Styling
 * 5. Mobile Responsiveness Support
 * 6. User Login Tracking & Excel/CSV Export
 * 7. Multi-Theme Switching & Persistence
 */

// Global Application State
const appState = {
    isAuthenticated: false,
    currentUser: null,
    currentRole: 'kiosk',
    pendingAccessRole: null,
    authPendingSource: null, // 'login' or 'navbar'
    pendingQuickUser: null,
    doctorScannedPatient: null,
    currentLang: 'hi-IN',
    voiceAssistantActive: true,
    isListening: false,
    selectedCategory: 'respiratory',
    selectedBodyZone: { name: 'Chest / Lungs', code: 'chest' },
    painScale: 4,
    currentTheme: 'pastel',
    prakriti: { vata: 32, pitta: 16, kapha: 52 },
    currentPatient: {
        tokenId: 'AY-2026-8942',
        name: 'Ramesh Kumar',
        age: 45,
        gender: 'Male',
        phone: '+91 98765 43210',
        vitals: { bp: '138/88', pulse: 78, spo2: 97, temp: 98.6 },
        complaint: 'Cough with whitish sputum for 3 days, mild fever (99.8°F), loss of appetite, aggravated during night time.',
        ayush: { agni: 'Manda (Sluggish/Low)', koshtha: 'Madhyama (Normal)', sleep: 'Disturbed / Night Cough' }
    },
    prescriptions: [
        { remedy: 'Sitopaladi Churna', dosage: '3 grams twice daily with Honey', freq: 'BID', duration: '5 Days' },
        { remedy: 'Kanthasudha Vati', dosage: '1 Tablet chewable as needed', freq: 'PRN', duration: '5 Days' }
    ]
};

let prakritiChart = null;

// Speech Recognition Init
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (SpeechRecognition) {
    try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const textEl = document.getElementById('chief-complaint-text');
            if (textEl) textEl.value = transcript;
            showToast('Voice Transcribed: ' + transcript);
            stopMicAnimation();
        };

        recognition.onerror = function() { stopMicAnimation(); };
        recognition.onend = function() { stopMicAnimation(); };
    } catch(e) { console.warn('Speech API init warning:', e); }
}

// ----------------------------------------------------
// INITIALIZATION ON DOM CONTENT LOADED
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 1. Load Saved Theme & Language
    loadSavedTheme();
    loadSavedLanguage();

    // 2. Initial Category and Body Zone Selection
    selectCategory('respiratory', true);

    // 3. Render initial tables and questions
    renderPrescriptionTable();
    loadDatabaseRecords();
    loadLoginAuditLogs();

    // 4. Initialize Tridosha Chart
    setTimeout(() => {
        try { initChart(); } catch(e) { console.warn('Chart init delay:', e); }
    }, 300);

    // 5. Run Splash Screen Intro
    runSplashScreen();
});

// ----------------------------------------------------
// 1. SPLASH SCREEN INTRO
// ----------------------------------------------------
function runSplashScreen() {
    const splash = document.getElementById('splash-screen');
    const progress = document.getElementById('splash-progress');
    const statusText = document.getElementById('splash-status-text');

    if (!splash) return;

    setTimeout(() => { if(progress) progress.style.width = '40%'; if(statusText) statusText.innerText = 'Loading Clinical Knowledge Base...'; }, 500);
    setTimeout(() => { if(progress) progress.style.width = '80%'; if(statusText) statusText.innerText = 'Initializing OPD Database & Tridosha Engine...'; }, 1400);
    setTimeout(() => { if(progress) progress.style.width = '100%'; if(statusText) statusText.innerText = 'AyurAyush AI Ready!'; }, 2200);

    setTimeout(() => {
        splash.classList.add('opacity-0');
        setTimeout(() => {
            splash.classList.add('hidden');
            splash.style.display = 'none';
            checkUserSession();
        }, 600);
    }, 2600);
}

function skipSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('hidden');
        splash.style.display = 'none';
    }
    checkUserSession();
}

// ----------------------------------------------------
// 2. AUTHENTICATION & LOGIN FLOW
// ----------------------------------------------------
function checkUserSession() {
    const saved = localStorage.getItem('ayur_current_user');
    if (saved) {
        try {
            appState.currentUser = JSON.parse(saved);
            appState.isAuthenticated = true;
            updateUserDisplay();
            switchRole(appState.currentUser.role || 'kiosk');
            return;
        } catch(e) {}
    }
    // Show login screen
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.remove('hidden');
        authScreen.style.display = 'flex';
    }
}

function switchAuthTab(tab) {
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');

    if (tab === 'login') {
        if(formLogin) { formLogin.classList.remove('hidden'); formLogin.style.display = 'block'; }
        if(formSignup) { formSignup.classList.add('hidden'); formSignup.style.display = 'none'; }
        if(tabLogin) tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-teal-700 text-white shadow-sm transition-all';
        if(tabSignup) tabSignup.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition-all';
    } else {
        if(formLogin) { formLogin.classList.add('hidden'); formLogin.style.display = 'none'; }
        if(formSignup) { formSignup.classList.remove('hidden'); formSignup.style.display = 'block'; }
        if(tabSignup) tabSignup.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-teal-700 text-white shadow-sm transition-all';
        if(tabLogin) tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-600 hover:text-slate-900 transition-all';
    }
}

// Password Visibility Eye Toggle Helper
function togglePasswordVisibility(inputId, eyeIconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(eyeIconId);
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function handleLogin(e) {
    if (e) e.preventDefault();
    const emailEl = document.getElementById('login-email');
    const roleEl = document.getElementById('login-role');
    const passEl = document.getElementById('login-pass');

    const email = emailEl ? emailEl.value.trim() : 'patient@hospital.com';
    const role = roleEl ? roleEl.value : 'kiosk';
    const pass = passEl ? passEl.value : '';

    let users = [];
    try {
        users = JSON.parse(localStorage.getItem('ayur_users') || '[]');
        if (!Array.isArray(users)) users = [];
    } catch(e) { users = []; }

    // Check if this account was created in signup
    const registeredUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (registeredUser) {
        // STRICT PASSWORD VALIDATION for registered users!
        if (registeredUser.pass !== pass) {
            alert('❌ Incorrect Password! Please enter the exact password you created during registration.');
            if (passEl) { passEl.value = ''; passEl.focus(); }
            return;
        }
        // Password verified successfully
        completeSuccessfulLogin({
            name: registeredUser.name,
            email: registeredUser.email,
            role: registeredUser.role || role
        });
        return;
    }

    // Unregistered accounts or default demo logins:
    const name = email.split('@')[0] ? (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)) : 'Patient User';

    if (role === 'doctor') {
        if (pass === 'moment123' || pass === '1234') {
            completeSuccessfulLogin({ name: 'Dr. ' + name, email, role });
        } else {
            appState.pendingQuickUser = { name: 'Dr. ' + name, email, role };
            attemptDoctorAccess('doctor', 'login');
        }
    } else if (role === 'admin') {
        if (pass === 'moment123' || pass === 'admin123' || pass === '5678') {
            completeSuccessfulLogin({ name: 'Admin (' + name + ')', email, role });
        } else {
            appState.pendingQuickUser = { name: 'Admin (' + name + ')', email, role };
            attemptDoctorAccess('admin', 'login');
        }
    } else {
        // Patient / Kiosk login for demo account
        if (email.toLowerCase() === 'patient@hospital.com') {
            if (pass !== '1234' && pass !== 'patient123') {
                alert('❌ Incorrect Demo Password! Use "1234" for the demo account or click "Create Account" to register.');
                if (passEl) { passEl.value = ''; passEl.focus(); }
                return;
            }
            completeSuccessfulLogin({ name: 'Ramesh Kumar', email, role: 'kiosk' });
        } else {
            // Unregistered user entered unknown email
            alert(`❌ No account found for "${email}". Please click the "Create Account" tab to register your password first.`);
        }
    }
}

function completeSuccessfulLogin(userObj) {
    appState.currentUser = userObj;
    appState.isAuthenticated = true;
    localStorage.setItem('ayur_current_user', JSON.stringify(userObj));

    // Record login into audit logs
    recordLoginEvent(userObj.name, userObj.email, userObj.role, 'Success');

    // Hide auth screen
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.add('hidden');
        authScreen.style.display = 'none';
    }

    updateUserDisplay();
    switchRole(userObj.role);
    showToast(`Welcome, ${userObj.name}!`);
}

function handleSignup(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const role = document.getElementById('signup-role').value;
    const pass = document.getElementById('signup-pass').value;

    let users = [];
    try {
        users = JSON.parse(localStorage.getItem('ayur_users') || '[]');
        if (!Array.isArray(users)) users = [];
    } catch(e) { users = []; }

    users.push({ name, email, role, pass });
    localStorage.setItem('ayur_users', JSON.stringify(users));

    // Record registration audit event
    recordLoginEvent(name, email, role, 'Account Registered');

    const alertEl = document.getElementById('signup-success-alert');
    if (alertEl) { alertEl.classList.remove('hidden'); alertEl.style.display = 'block'; }

    document.getElementById('login-email').value = email;
    document.getElementById('login-role').value = role;
    document.getElementById('login-pass').value = '';

    setTimeout(() => {
        switchAuthTab('login');
        showToast('Account registered! Please sign in.');
    }, 700);
}

function quickDemoLogin(role) {
    let name = 'Ramesh Kumar';
    let email = 'patient@hospital.com';

    if (role === 'doctor') {
        name = 'Dr. V. K. Sharma';
        email = 'dr.sharma@aiia.gov.in';
        appState.pendingQuickUser = { name, email, role };
        attemptDoctorAccess('doctor', 'login');
        return;
    } else if (role === 'admin') {
        name = 'OPD Administrator';
        email = 'admin@aiia.gov.in';
        appState.pendingQuickUser = { name, email, role };
        attemptDoctorAccess('admin', 'login');
        return;
    }

    completeSuccessfulLogin({ name, email, role: 'kiosk' });
}

function logoutUser() {
    localStorage.removeItem('ayur_current_user');
    appState.currentUser = null;
    appState.isAuthenticated = false;
    appState.doctorScannedPatient = null;
    appState.pendingAccessRole = null;
    appState.authPendingSource = null;

    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.remove('hidden');
        authScreen.style.display = 'flex';
    }
    showToast('Signed out of portal.');
}

function updateUserDisplay() {
    if (!appState.currentUser) return;
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    if (nameEl) nameEl.innerText = appState.currentUser.name;
    if (roleEl) roleEl.innerText = `${appState.currentUser.role.toUpperCase()} ACCESS`;
}

// ----------------------------------------------------
// 3. WORKSPACE PASSWORD SECURITY & CANCEL PROTECTION
// ----------------------------------------------------
function attemptDoctorAccess(targetRole, source = 'navbar') {
    appState.pendingAccessRole = targetRole;
    appState.authPendingSource = source;

    const titleEl = document.getElementById('lock-modal-title');
    const descEl = document.getElementById('lock-modal-desc');
    const inputEl = document.getElementById('lock-pass-input');
    const errEl = document.getElementById('lock-error-text');
    const modalEl = document.getElementById('password-lock-modal');

    if (titleEl) {
        titleEl.innerText = targetRole === 'doctor' 
            ? 'Doctor Workspace Authorization' 
            : 'OPD Admin & Database Authorization';
    }
    if (descEl) {
        descEl.innerText = targetRole === 'doctor'
            ? 'Authorized Doctor credentials required to access patient clinical SOAP records.'
            : 'Administrator credentials required to view database logs and system settings.';
    }

    if (inputEl) {
        inputEl.value = '';
        inputEl.type = 'password';
        const eyeIcon = document.getElementById('eye-lock-pass');
        if (eyeIcon) { eyeIcon.className = 'fa-solid fa-eye'; }
    }
    if (errEl) { errEl.classList.add('hidden'); errEl.style.display = 'none'; }

    // Hide auth screen while password modal is up
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.add('hidden');
        authScreen.style.display = 'none';
    }

    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.style.display = 'flex';
    }
}

function verifyPagePassword() {
    const inputEl = document.getElementById('lock-pass-input');
    const typed = inputEl ? inputEl.value.trim() : '';
    const role = appState.pendingAccessRole;
    const isDoctorValid = (role === 'doctor' && (typed === 'moment123' || typed === '1234'));
    const isAdminValid = (role === 'admin' && (typed === 'admin123' || typed === 'moment123' || typed === '5678'));

    if (isDoctorValid || isAdminValid) {
        closePasswordLockModalOnly();

        if (appState.authPendingSource === 'login') {
            const user = appState.pendingQuickUser || {
                name: role === 'doctor' ? 'Dr. V. K. Sharma' : 'OPD Administrator',
                email: `${role}@aiia.gov.in`,
                role: role
            };
            completeSuccessfulLogin(user);
        } else {
            // Accessed from navbar while already logged in
            switchRole(role);
            showToast(`${role === 'doctor' ? 'Doctor Workspace' : 'Database Records'} Unlocked!`);
        }

        appState.pendingAccessRole = null;
        appState.authPendingSource = null;
        appState.pendingQuickUser = null;
    } else {
        const errEl = document.getElementById('lock-error-text');
        if (errEl) { errEl.classList.remove('hidden'); errEl.style.display = 'block'; }
    }
}

// Cancelling password modal: DOES NOT redirect into unauthorized view!
function closePasswordLockModal() {
    closePasswordLockModalOnly();

    // If user cancelled during login flow, return to Login Screen!
    if (appState.authPendingSource === 'login' || !appState.isAuthenticated) {
        const authScreen = document.getElementById('auth-screen');
        if (authScreen) {
            authScreen.classList.remove('hidden');
            authScreen.style.display = 'flex';
        }
        showToast('Login cancelled. Returned to sign in.');
    } else {
        // User was already in Kiosk and cancelled doctor switch: stay on Kiosk
        switchRole('kiosk');
        showToast('Access cancelled.');
    }

    appState.pendingAccessRole = null;
    appState.authPendingSource = null;
    appState.pendingQuickUser = null;
}

function closePasswordLockModalOnly() {
    const modalEl = document.getElementById('password-lock-modal');
    if (modalEl) { modalEl.classList.add('hidden'); modalEl.style.display = 'none'; }
}

// ----------------------------------------------------
// 4. SIDEBAR & THEME SWITCHER (Full Persistence)
// ----------------------------------------------------
function openSidebar() {
    const backdrop = document.getElementById('sidebar-backdrop');
    const drawer = document.getElementById('sidebar-drawer');
    if (backdrop) backdrop.classList.remove('hidden');
    if (drawer) drawer.classList.add('open');
}

function closeSidebar() {
    const backdrop = document.getElementById('sidebar-backdrop');
    const drawer = document.getElementById('sidebar-drawer');
    if (backdrop) backdrop.classList.add('hidden');
    if (drawer) drawer.classList.remove('open');
}

function openDatabaseFromSidebar() {
    closeSidebar();
    attemptDoctorAccess('admin', 'navbar');
}

// 5 Themes: pastel, emerald, sky, amber, dark
function setAppTheme(theme) {
    const body = document.getElementById('body-root');
    if (!body) return;

    // Remove all previous theme classes
    body.classList.remove('theme-emerald', 'theme-sky', 'theme-amber', 'theme-dark');

    if (theme === 'emerald') body.classList.add('theme-emerald');
    else if (theme === 'sky') body.classList.add('theme-sky');
    else if (theme === 'amber') body.classList.add('theme-amber');
    else if (theme === 'dark') body.classList.add('theme-dark');

    appState.currentTheme = theme;
    localStorage.setItem('ayur_theme', theme);

    // Update active label in sidebar
    const label = document.getElementById('active-theme-label');
    if (label) {
        const names = { pastel: 'Clinical Teal', emerald: 'Herbal Emerald', sky: 'Ocean Sky', amber: 'Ayush Amber', dark: 'Dark Glass' };
        label.innerText = names[theme] || theme.toUpperCase();
    }

    // Highlight theme selector cards
    document.querySelectorAll('.theme-select-card').forEach(c => c.classList.remove('active-theme', 'ring-2'));
    const activeCard = document.getElementById(`theme-btn-${theme}`);
    if (activeCard) {
        activeCard.classList.add('active-theme', 'ring-2');
    }

    // Update Chart theme color
    updateChartThemeColor();
    showToast(`App theme set to ${(theme.charAt(0).toUpperCase() + theme.slice(1))}`);
}

function loadSavedTheme() {
    const saved = localStorage.getItem('ayur_theme') || 'pastel';
    setAppTheme(saved);
}

function updateChartThemeColor() {
    if (!prakritiChart) return;
    const colors = {
        pastel: { bg: 'rgba(15, 118, 110, 0.25)', border: '#0f766e', pt: '#115e59' },
        emerald: { bg: 'rgba(5, 150, 105, 0.25)', border: '#059669', pt: '#047857' },
        sky: { bg: 'rgba(2, 132, 199, 0.25)', border: '#0284c7', pt: '#0369a1' },
        amber: { bg: 'rgba(217, 119, 6, 0.25)', border: '#d97706', pt: '#b45309' },
        dark: { bg: 'rgba(20, 184, 166, 0.35)', border: '#14b8a6', pt: '#2dd4bf' }
    };
    const c = colors[appState.currentTheme] || colors.pastel;
    prakritiChart.data.datasets[0].backgroundColor = c.bg;
    prakritiChart.data.datasets[0].borderColor = c.border;
    prakritiChart.data.datasets[0].pointBackgroundColor = c.pt;
    prakritiChart.update();
}

// ----------------------------------------------------
// 5. INTERACTIVE BODY MAP & SYMPTOM CATEGORIES SYNC
// ----------------------------------------------------
const bodyZoneData = {
    head: { name: 'Head & Senses', label: 'Headache / Fever / Migraine', category: 'fever', defaultPain: 6 },
    chest: { name: 'Chest / Lungs', label: 'Cough / Cold / Asthma (Kasa)', category: 'respiratory', defaultPain: 4 },
    abdomen: { name: 'Abdomen / Stomach', label: 'Acidity / Gas / Agnimandya', category: 'digestive', defaultPain: 5 },
    legs: { name: 'Knees & Joints', label: 'Joint Pain / Amavata / Stiffness', category: 'joint', defaultPain: 7 }
};

const categoryPresets = {
    respiratory: {
        zone: 'chest',
        title: 'Cough / Cold (Kasa & Shwasa)',
        complaint: 'Cough with whitish sputum for 3 days, mild fever (99.8°F), loss of appetite, aggravated during night time.'
    },
    joint: {
        zone: 'legs',
        title: 'Joint Pain (Amavata & Sandhigata Vata)',
        complaint: 'Bilateral knee joint pain with severe morning stiffness lasting > 1 hour, difficulty walking and swelling.'
    },
    digestive: {
        zone: 'abdomen',
        title: 'Stomach / Gas (Amlapitta & Agnimandya)',
        complaint: 'Stomach burning after meals, hyperacidity, sour belching, constipation and sluggish appetite.'
    },
    fever: {
        zone: 'head',
        title: 'Fever / Headache (Jwara & Shiroshoola)',
        complaint: 'High temperature (100.4°F) with frontal throbbing headache, body aches, shivering chills, and weakness since 2 days.'
    }
};

function selectCategory(cat, syncZone = true) {
    appState.selectedCategory = cat;
    const preset = categoryPresets[cat];

    // 1. Update Symptom Category Buttons Visual Active State
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('cat-btn-active', 'bg-teal-50', 'border-teal-600', 'border-teal-500');
        btn.classList.add('bg-slate-50', 'border-slate-200');
        const check = btn.querySelector('.cat-check');
        if (check) check.classList.add('hidden');
    });

    const activeBtn = document.getElementById(`cat-btn-${cat}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-50', 'border-slate-200');
        activeBtn.classList.add('cat-btn-active', 'bg-teal-50');
        const check = activeBtn.querySelector('.cat-check');
        if (check) check.classList.remove('hidden');
    }

    // 2. Update Adaptive Questions
    renderAdaptiveQuestions(cat);

    // 3. Update Chief Complaint Textarea
    const textEl = document.getElementById('chief-complaint-text');
    if (textEl && preset) {
        textEl.value = preset.complaint;
    }

    // 4. Bidirectional Sync with Body Map
    if (syncZone && preset) {
        selectBodyZone(preset.zone, false);
    }
}

function selectBodyZone(code, syncCategory = true) {
    const data = bodyZoneData[code] || { name: 'Whole Body', label: 'General Symptoms', category: 'respiratory', defaultPain: 4 };
    appState.selectedBodyZone = { name: data.name, code: code };

    // 1. Highlight SVG path with pulse & active style
    document.querySelectorAll('.body-zone').forEach(path => {
        path.classList.remove('zone-active');
        path.style.fill = '';
        path.style.stroke = '';
        path.style.filter = '';
    });

    const activePath = document.getElementById(`zone-${code}`);
    if (activePath) {
        activePath.classList.add('zone-active');
    }

    // 2. Update UI labels
    const nameEl = document.getElementById('selected-zone-name');
    const descEl = document.getElementById('selected-zone-desc');
    if (nameEl) nameEl.innerText = data.name;
    if (descEl) descEl.innerText = data.label;

    // 3. Update Pain Scale
    const slider = document.getElementById('pain-scale-slider');
    if (slider) {
        slider.value = data.defaultPain;
        updatePainScaleDisplay();
    }

    // 4. Bidirectional Sync with Symptom Category Box
    if (syncCategory && data.category) {
        selectCategory(data.category, false);
    }
}

function updatePainScaleDisplay() {
    const slider = document.getElementById('pain-scale-slider');
    const val = slider ? slider.value : 4;
    appState.painScale = val;
    const el = document.getElementById('pain-scale-val');
    if (!el) return;

    let desc = 'Mild';
    if (val >= 4 && val <= 6) desc = 'Moderate';
    else if (val >= 7) desc = 'Severe';

    el.innerText = `Level ${val} - ${desc}`;
}

function renderAdaptiveQuestions(cat) {
    const container = document.getElementById('adaptive-question-container');
    if (!container) return;
    const t = appTranslations[appState.currentLang] || appTranslations['en-US'];
    const q = (t.questions && t.questions[cat]) ? t.questions[cat] : (appTranslations['en-US'].questions[cat]);

    let borderCol = 'border-teal-200';
    let textCol = 'text-teal-800';
    let hoverBg = 'hover:bg-teal-50';
    let inputRadio = `<input type="radio" name="rq1" checked onclick="updateKasaType('Kapha')">`;
    let inputRadio2 = `<input type="radio" name="rq1" onclick="updateKasaType('Vata')">`;

    if (cat === 'joint') {
        borderCol = 'border-amber-200';
        textCol = 'text-amber-800';
        hoverBg = 'hover:bg-amber-50';
        inputRadio = `<input type="radio" name="jq1" checked>`;
        inputRadio2 = `<input type="radio" name="jq1">`;
    } else if (cat === 'digestive') {
        borderCol = 'border-sky-200';
        textCol = 'text-sky-800';
        hoverBg = 'hover:bg-sky-50';
        inputRadio = `<input type="radio" name="dq1" checked>`;
        inputRadio2 = `<input type="radio" name="dq1">`;
    } else if (cat === 'fever') {
        borderCol = 'border-rose-200';
        textCol = 'text-rose-800';
        hoverBg = 'hover:bg-rose-50';
        inputRadio = `<input type="radio" name="fq1" checked>`;
        inputRadio2 = `<input type="radio" name="fq1">`;
    }

    container.innerHTML = `
        <div class="p-3 bg-slate-50 rounded-xl border ${borderCol} text-xs space-y-1.5">
            <label class="font-bold ${textCol} block">${q.title}</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label class="flex items-center space-x-2 cursor-pointer font-medium p-1.5 rounded-lg ${hoverBg}">${inputRadio}<span>${q.opt1}</span></label>
                <label class="flex items-center space-x-2 cursor-pointer font-medium p-1.5 rounded-lg ${hoverBg}">${inputRadio2}<span>${q.opt2}</span></label>
            </div>
        </div>
    `;
}

function updateKasaType(type) {
    appState.prakriti = type === 'Kapha' ? { vata: 25, pitta: 20, kapha: 55 } : { vata: 60, pitta: 25, kapha: 15 };
    updateChartData();
}

function initChart() {
    const canvas = document.getElementById('prakritiChart');
    if (!canvas || !window.Chart) return;
    try {
        const ctx = canvas.getContext('2d');
        prakritiChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Vata (Air/Ether)', 'Pitta (Fire)', 'Kapha (Water/Earth)'],
                datasets: [{
                    label: 'Tridosha Imbalance %',
                    data: [appState.prakriti.vata, appState.prakriti.pitta, appState.prakriti.kapha],
                    backgroundColor: 'rgba(15, 118, 110, 0.25)',
                    borderColor: '#0f766e',
                    pointBackgroundColor: '#115e59',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { 
                    r: { 
                        angleLines: { color: 'rgba(0,0,0,0.1)' }, 
                        grid: { color: 'rgba(0,0,0,0.1)' }, 
                        ticks: { display: false, max: 80, min: 0 } 
                    } 
                },
                plugins: { legend: { display: false } }
            }
        });
        updateChartThemeColor();
    } catch(e) {}
}

function recalculatePrakriti() {
    const agniEl = document.getElementById('ayush-agni');
    const koshthaEl = document.getElementById('ayush-koshtha');
    const agni = agniEl ? agniEl.value : '';
    const koshtha = koshthaEl ? koshthaEl.value : '';

    let v = 30, p = 30, k = 40;
    if (agni.includes('Manda') || agni.includes('Low')) k += 20;
    if (agni.includes('Tikshna')) p += 25;
    if (koshtha.includes('Kroora')) v += 25;

    const total = v + p + k;
    appState.prakriti = { 
        vata: Math.round((v/total)*100), 
        pitta: Math.round((p/total)*100), 
        kapha: Math.round((k/total)*100) 
    };
    updateChartData();
}

function updateChartData() {
    if (!prakritiChart) return;
    try {
        prakritiChart.data.datasets[0].data = [appState.prakriti.vata, appState.prakriti.pitta, appState.prakriti.kapha];
        prakritiChart.update();
    } catch(e) {}
    const tag = document.getElementById('dosha-imbalance-tag');
    if (tag) tag.innerText = `Kapha ${appState.prakriti.kapha}%, Vata ${appState.prakriti.vata}%, Pitta ${appState.prakriti.pitta}%`;
}

// ----------------------------------------------------
// 6. PATIENT KIOSK SUBMISSION & QR SLIP MODAL
// ----------------------------------------------------
function submitPatientKiosk() {
    const nameVal = document.getElementById('patient-name')?.value.trim() || 'Ramesh Kumar';
    const ageVal = parseInt(document.getElementById('patient-age')?.value) || 45;
    const genderVal = document.getElementById('patient-gender')?.value || 'Male';
    const phoneVal = document.getElementById('patient-phone')?.value.trim() || '+91 98765 43210';
    const complaintVal = document.getElementById('chief-complaint-text')?.value.trim() || 'Cough with whitish sputum for 3 days';

    // Generate Token ID if new
    const tokenId = 'AY-2026-' + Math.floor(1000 + Math.random() * 9000);

    appState.currentPatient = {
        tokenId: tokenId,
        name: nameVal,
        age: ageVal,
        gender: genderVal,
        phone: phoneVal,
        complaint: complaintVal,
        diag: getAyurvedicDiagnosis(appState.selectedCategory),
        vitals: {
            bp: document.getElementById('vital-bp')?.value || '138/88',
            pulse: parseInt(document.getElementById('vital-pulse')?.value) || 78,
            spo2: parseInt(document.getElementById('vital-spo2')?.value) || 97,
            temp: document.getElementById('vital-temp')?.value || '98.6'
        },
        ayush: {
            agni: document.getElementById('ayush-agni')?.value || 'Manda (Low)',
            koshtha: document.getElementById('ayush-koshtha')?.value || 'Madhyama (Normal)',
            sleep: document.getElementById('ayush-sleep')?.value || 'Disturbed'
        }
    };

    let db = [];
    try {
        db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
        if (!Array.isArray(db)) db = [];
    } catch (e) { db = []; }

    db.unshift(appState.currentPatient);
    localStorage.setItem('ayur_db', JSON.stringify(db));

    renderPatientQrModal();
    renderAdminRecords();
    showToast('Saved to Database! OPD QR Token generated.');
}

function getAyurvedicDiagnosis(cat) {
    if (cat === 'respiratory') return 'Kaphaja Kasa (Acute Bronchitis)';
    if (cat === 'joint') return 'Amavata (Rheumatoid Arthritis)';
    if (cat === 'digestive') return 'Amlapitta & Agnimandya (Dyspepsia)';
    return 'Vata-Kaphaja Jwara (Viral Pyrexia)';
}

function renderPatientQrModal() {
    const container = document.getElementById('modal-qrcode-container');
    if (container) {
        container.innerHTML = '';
        if (window.QRCode) {
            try {
                new QRCode(container, {
                    text: `AIIA-OPD:${appState.currentPatient.tokenId}|NAME:${appState.currentPatient.name}|DIAG:${appState.currentPatient.diag}`,
                    width: 160,
                    height: 160,
                    colorDark: "#0f766e",
                    colorLight: "#ffffff"
                });
            } catch(e) { container.innerText = '[QR Code Ready]'; }
        } else {
            container.innerText = '[QR Code Ready]';
        }
    }

    const tId = document.getElementById('modal-qr-token-id');
    const pName = document.getElementById('modal-qr-patient-name');
    const bpEl = document.getElementById('modal-qr-bp');
    const spo2El = document.getElementById('modal-qr-spo2');
    const symEl = document.getElementById('modal-qr-symptoms');

    if (tId) tId.innerText = appState.currentPatient.tokenId;
    if (pName) pName.innerText = `${appState.currentPatient.name} (${appState.currentPatient.age}${appState.currentPatient.gender ? appState.currentPatient.gender.charAt(0) : 'M'})`;
    if (bpEl) bpEl.innerText = appState.currentPatient.vitals.bp;
    if (spo2El) spo2El.innerText = appState.currentPatient.vitals.spo2 + '%';
    if (symEl) symEl.innerText = appState.currentPatient.complaint;

    const modal = document.getElementById('patient-qr-modal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
}

function closePatientQrModal() {
    const modal = document.getElementById('patient-qr-modal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function switchToDoctorAndScan() {
    closePatientQrModal();
    attemptDoctorAccess('doctor', 'navbar');
}

// ----------------------------------------------------
// 7. DOCTOR QR SCANNER & SOAP WORKSPACE
// ----------------------------------------------------
function openDoctorQrScannerModal() {
    const scannerBox = document.getElementById('scanner-qrcode-box');
    if (scannerBox) {
        scannerBox.innerHTML = '';
        if (window.QRCode) {
            try {
                new QRCode(scannerBox, {
                    text: `AIIA-OPD:${appState.currentPatient.tokenId}|NAME:${appState.currentPatient.name}`,
                    width: 120,
                    height: 120,
                    colorDark: "#0d9488",
                    colorLight: "#ffffff"
                });
            } catch(e) {}
        }
    }

    const list = document.getElementById('scanner-patient-list');
    if (list) {
        let db = [];
        try {
            db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
            if (!Array.isArray(db)) db = [];
        } catch (e) { db = []; }

        let html = '';
        if (db.length === 0) {
            html = `<p class="text-slate-500 italic p-2">No QR tokens saved yet in database.</p>`;
        } else {
            db.forEach((p, idx) => {
                html += `
                    <div onclick="selectScanTarget('${p.tokenId}')" class="p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg cursor-pointer flex justify-between items-center transition-all ${idx === 0 ? 'border-teal-500 bg-teal-50' : ''}">
                        <span class="font-bold text-slate-900">${p.name} <span class="font-mono text-teal-800">(${p.tokenId})</span></span>
                        <span class="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">Scan QR</span>
                    </div>
                `;
            });
        }
        list.innerHTML = html;
    }

    const modal = document.getElementById('qr-scanner-modal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
}

function selectScanTarget(tokenId) {
    let db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
    const target = db.find(p => p.tokenId === tokenId);
    if (target) {
        appState.currentPatient = target;
        showToast(`Selected Patient: ${target.name}`);
    }
}

function executeQrScanLoad() {
    closeQrScannerModal();
    appState.doctorScannedPatient = appState.currentPatient;
    updateDoctorDashboard();
    showToast('QR Scanned! Patient case loaded into 30-Sec SOAP Summary.');
}

function closeQrScannerModal() {
    const modal = document.getElementById('qr-scanner-modal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function updateDoctorDashboard() {
    const emptyState = document.getElementById('doctor-empty-state');
    const soapContent = document.getElementById('doctor-soap-content');

    if (!appState.doctorScannedPatient) {
        if (emptyState) { emptyState.classList.remove('hidden'); emptyState.style.display = 'block'; }
        if (soapContent) { soapContent.classList.add('hidden'); soapContent.style.display = 'none'; }
        return;
    }

    if (emptyState) { emptyState.classList.add('hidden'); emptyState.style.display = 'none'; }
    if (soapContent) { soapContent.classList.remove('hidden'); soapContent.style.display = 'block'; }

    const tokenEl = document.getElementById('doc-view-token');
    const subjEl = document.getElementById('soap-subjective');
    const objEl = document.getElementById('soap-objective');

    const p = appState.doctorScannedPatient;
    if (tokenEl) tokenEl.innerText = p.tokenId;
    if (subjEl) subjEl.innerText = `Patient ${p.name} (${p.age}${p.gender ? p.gender.charAt(0) : 'M'}) reports: ${p.complaint}`;
    if (objEl) objEl.innerText = `Vitals: BP ${p.vitals ? p.vitals.bp : '138/88'}, Pulse ${p.vitals ? p.vitals.pulse : 78} bpm, SpO2 ${p.vitals ? p.vitals.spo2 : 97}%. Digestion: Low | Body Type: Kapha ${appState.prakriti.kapha}%, Vata ${appState.prakriti.vata}%.`;

    renderPrescriptionTable();
    generateQRCode(p.tokenId);
}

function generateQRCode(tokenId) {
    const container = document.getElementById('qrcode-display');
    if (!container) return;
    container.innerHTML = '';
    if (window.QRCode) {
        try {
            new QRCode(container, {
                text: `AIIA-OPD:${tokenId}|NAME:${appState.currentPatient.name}`,
                width: 120,
                height: 120,
                colorDark: "#0f766e",
                colorLight: "#ffffff"
            });
        } catch(e) {}
    }
}

function renderPrescriptionTable() {
    const container = document.getElementById('prescription-table-container');
    if (!container) return;
    let html = `<table class="w-full text-left text-xs"><thead><tr class="text-slate-600 border-b border-slate-200"><th class="py-1.5 font-bold">Remedy</th><th class="py-1.5 font-bold">Dosage</th><th class="py-1.5 font-bold">Freq</th><th class="py-1.5 font-bold">Duration</th></tr></thead><tbody class="divide-y divide-slate-100">`;
    appState.prescriptions.forEach(rx => {
        html += `<tr><td class="py-2 font-bold text-amber-900">${rx.remedy}</td><td class="py-2 font-medium">${rx.dosage}</td><td class="py-2 font-medium">${rx.freq}</td><td class="py-2 text-teal-800 font-bold">${rx.duration}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function processDictationToRx() {
    appState.prescriptions.unshift({ remedy: 'Sitopaladi Churna', dosage: '3g with Honey', freq: 'BID', duration: '5 Days' });
    renderPrescriptionTable();
    showToast('Voice dictation parsed into prescription formulation!');
}

function signAndPrintPrescription() {
    const chk = document.getElementById('doc-verify-check');
    if (chk && !chk.checked) {
        alert('Please check "Doctor Verification Complete" first.');
        return;
    }
    const tEl = document.getElementById('print-token-id');
    const pEl = document.getElementById('print-patient-name');
    if (tEl) tEl.innerText = appState.currentPatient.tokenId;
    if (pEl) pEl.innerText = appState.currentPatient.name;

    const tbody = document.getElementById('print-rx-body');
    if (tbody) {
        let html = '';
        appState.prescriptions.forEach(rx => {
            html += `<tr><td class="p-2 font-bold text-teal-900">${rx.remedy}</td><td class="p-2">${rx.dosage}</td><td class="p-2">${rx.freq}</td><td class="p-2 font-semibold">${rx.duration}</td></tr>`;
        });
        tbody.innerHTML = html;
    }

    const modal = document.getElementById('print-modal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
}

function closePrintModal() {
    const modal = document.getElementById('print-modal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

// ----------------------------------------------------
// 8. DATABASE RECORDS, LOGIN AUDIT LOGS & EXCEL EXPORT
// ----------------------------------------------------
function loadDatabaseRecords() {
    try {
        let db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
        if (!Array.isArray(db) || db.length === 0) {
            db = getInitialSampleDatabase();
            localStorage.setItem('ayur_db', JSON.stringify(db));
        }
    } catch (e) {
        const db = getInitialSampleDatabase();
        localStorage.setItem('ayur_db', JSON.stringify(db));
    }
    renderAdminRecords();
}

function getInitialSampleDatabase() {
    return [
        { tokenId: 'AY-2026-8942', name: 'Ramesh Kumar', age: 45, gender: 'Male', phone: '+91 98765 43210', vitals: { bp: '138/88', pulse: 78, spo2: 97, temp: 98.6 }, complaint: 'Cough with whitish sputum for 3 days, mild fever (99.8°F), loss of appetite.', diag: 'Kaphaja Kasa (Acute Bronchitis)' },
        { tokenId: 'AY-2026-8943', name: 'Sunita Devi', age: 52, gender: 'Female', phone: '+91 98765 43211', vitals: { bp: '142/90', pulse: 82, spo2: 96, temp: 98.4 }, complaint: 'Knee Joint Pain & Morning Stiffness > 1 hour.', diag: 'Amavata (Rheumatoid Arthritis)' },
        { tokenId: 'AY-2026-8944', name: 'Anil Sharma', age: 38, gender: 'Male', phone: '+91 98765 43212', vitals: { bp: '124/80', pulse: 74, spo2: 98, temp: 98.6 }, complaint: 'Acid Reflux, stomach burning & Agnimandya.', diag: 'Amlapitta (Dyspepsia)' }
    ];
}

function resetDatabaseToDefault() {
    const db = getInitialSampleDatabase();
    localStorage.setItem('ayur_db', JSON.stringify(db));
    renderAdminRecords();
    showToast('Database reset to initial sample patient cases!');
}

function renderAdminRecords() {
    const tbody = document.getElementById('admin-records-table-body');
    const countEl = document.getElementById('admin-patient-count');
    if (!tbody) return;

    let db = [];
    try {
        db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
        if (!Array.isArray(db)) db = [];
    } catch (e) { db = []; }

    if (countEl) countEl.innerText = db.length;

    if (db.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-6 text-center text-slate-500 font-semibold bg-slate-50">
                    <p class="text-sm font-bold text-slate-700">No patient records found in database.</p>
                    <button onclick="resetDatabaseToDefault()" class="mt-2 px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-xl shadow">Reset Sample Cases</button>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    db.forEach((r, idx) => {
        const name = r.name || 'Ramesh Kumar';
        const tokenId = r.tokenId || `AY-2026-${8942 + idx}`;
        const age = r.age || '45';
        const genderStr = (typeof r.gender === 'string' && r.gender.length > 0) ? r.gender.charAt(0) : 'M';
        const vitalsBp = (r.vitals && r.vitals.bp) ? r.vitals.bp : '138/88';
        const vitalsSpo2 = (r.vitals && r.vitals.spo2) ? r.vitals.spo2 : '97';
        const complaint = r.complaint || 'Cough with whitish sputum for 3 days';
        const diag = r.diag || 'Kaphaja Kasa';

        html += `
            <tr class="hover:bg-teal-50/50 transition-all border-b border-slate-100">
                <td class="p-3 font-mono font-bold text-teal-800 whitespace-nowrap">${tokenId}</td>
                <td class="p-3 font-bold text-slate-900 whitespace-nowrap">${name}</td>
                <td class="p-3 font-semibold text-slate-700 whitespace-nowrap">${age}/${genderStr}</td>
                <td class="p-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">BP: ${vitalsBp} | SpO2: ${vitalsSpo2}%</td>
                <td class="p-3 text-slate-600 font-medium max-w-xs truncate">${complaint}</td>
                <td class="p-3 text-amber-800 font-bold whitespace-nowrap">${diag}</td>
                <td class="p-3 whitespace-nowrap">
                    <button onclick="loadPatientSOAP('${tokenId}')" class="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold rounded-lg shadow transition-all">
                        Scan & View SOAP
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function loadPatientSOAP(tokenId) {
    let db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
    const patient = db.find(p => p.tokenId === tokenId);
    if (patient) {
        appState.currentPatient = patient;
        appState.doctorScannedPatient = patient;
        attemptDoctorAccess('doctor', 'navbar');
    }
}

// ----------------------------------------------------
// USER LOGIN AUDIT TRACKING & EXCEL (.CSV) BACKEND
// (Completely separate from Admin Patient Database)
// ----------------------------------------------------
function recordLoginEvent(name, email, role, status = 'Success') {
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0') + ' ' + 
        String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0') + ':' + 
        String(now.getSeconds()).padStart(2, '0');

    const isMobile = window.innerWidth <= 640 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const device = isMobile ? 'Mobile Smartphone' : 'Desktop / Laptop Browser';

    const newLog = {
        id: 'LOG-' + Math.floor(100000 + Math.random() * 900000),
        name: name || 'Anonymous User',
        email: email || 'user@hospital.com',
        role: (role || 'KIOSK').toUpperCase(),
        loginTime: dateStr,
        device: device,
        status: status
    };

    // 1. Post to Backend Server (appends to user_logins.csv on server disk if server.py is running)
    try {
        fetch('/api/login-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newLog)
        }).then(res => {
            if (res.ok) {
                console.log('[BACKEND SERVER] Login recorded into user_logins.csv');
                const badge = document.getElementById('excel-sync-badge');
                if (badge) {
                    badge.innerText = 'Server Synced';
                    badge.className = 'text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200';
                }
            }
        }).catch(() => {
            // Server offline / standalone file mode: local storage handles it smoothly
        });
    } catch(e) {}

    // 2. Stream to Live Online Google Sheet (Works automatically on GitHub Pages across all devices worldwide)
    const cloudSheetUrl = localStorage.getItem('ayur_sheet_webhook') || window.AYUR_CLOUD_WEBHOOK_URL;
    if (cloudSheetUrl) {
        try {
            fetch(cloudSheetUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLog)
            }).then(() => {
                console.log('[CLOUD EXCEL] Login details streamed live to Google Sheet!');
            }).catch(() => {});
        } catch(e) {}
    }

    // 3. Save into separate client-side store
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem('ayur_login_logs') || '[]');
        if (!Array.isArray(logs)) logs = [];
    } catch (e) { logs = []; }

    logs.unshift(newLog);
    if (logs.length > 300) logs = logs.slice(0, 300);
    localStorage.setItem('ayur_login_logs', JSON.stringify(logs));

    renderModalLoginLogs();
}

function setGoogleSheetWebhook() {
    const current = localStorage.getItem('ayur_sheet_webhook') || '';
    const url = prompt('Enter your Google Sheets / Apps Script Webhook URL to stream logins from all devices worldwide into a live Google Sheet / Excel:', current);
    if (url !== null) {
        if (url.trim()) {
            localStorage.setItem('ayur_sheet_webhook', url.trim());
            showToast('Google Sheet Webhook connected! All logins from any device will stream into your Sheet.');
        } else {
            localStorage.removeItem('ayur_sheet_webhook');
            showToast('Google Sheet Webhook disconnected.');
        }
    }
}

function loadLoginAuditLogs() {
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem('ayur_login_logs') || '[]');
        if (!Array.isArray(logs) || logs.length === 0) {
            logs = [
                { id: 'LOG-891024', name: 'Dr. V. K. Sharma', email: 'dr.sharma@aiia.gov.in', role: 'DOCTOR', loginTime: '2026-09-10 09:15:20', device: 'Desktop / Laptop Browser', status: 'Success' },
                { id: 'LOG-891023', name: 'Ramesh Kumar', email: 'ramesh.k@gmail.com', role: 'KIOSK', loginTime: '2026-09-10 09:30:45', device: 'Mobile Smartphone', status: 'Success' },
                { id: 'LOG-891022', name: 'OPD Administrator', email: 'admin@aiia.gov.in', role: 'ADMIN', loginTime: '2026-09-10 08:45:10', device: 'Desktop / Laptop Browser', status: 'Success' },
                { id: 'LOG-891021', name: 'Sunita Devi', email: 'sunita.d@yahoo.com', role: 'KIOSK', loginTime: '2026-09-10 10:12:33', device: 'Mobile Smartphone', status: 'Success' }
            ];
            localStorage.setItem('ayur_login_logs', JSON.stringify(logs));
        }
    } catch(e) { logs = []; }

    renderModalLoginLogs();
}

function openLoginDetailsModal() {
    closeSidebar();
    renderModalLoginLogs();
    const modal = document.getElementById('login-details-modal');
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
}

function closeLoginDetailsModal() {
    const modal = document.getElementById('login-details-modal');
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
}

function renderModalLoginLogs() {
    const tbody = document.getElementById('modal-logins-table-body') || document.getElementById('admin-logins-table-body');
    if (!tbody) return;

    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem('ayur_login_logs') || '[]');
        if (!Array.isArray(logs)) logs = [];
    } catch (e) { logs = []; }

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500 font-semibold">No login sessions recorded yet.</td></tr>`;
        return;
    }

    let html = '';
    logs.forEach(l => {
        let badgeColor = 'bg-teal-100 text-teal-800';
        if (l.role === 'DOCTOR') badgeColor = 'bg-blue-100 text-blue-800';
        if (l.role === 'ADMIN') badgeColor = 'bg-amber-100 text-amber-900';

        html += `
            <tr class="hover:bg-slate-100/70 transition-all border-b border-slate-100">
                <td class="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">${l.id}</td>
                <td class="p-3 font-bold text-slate-900 whitespace-nowrap">${l.name}</td>
                <td class="p-3 text-slate-600 whitespace-nowrap">${l.email}</td>
                <td class="p-3 whitespace-nowrap"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${l.role}</span></td>
                <td class="p-3 font-mono text-slate-700 text-[11px] whitespace-nowrap">${l.loginTime}</td>
                <td class="p-3 text-slate-600 text-xs whitespace-nowrap">${l.device}</td>
                <td class="p-3 whitespace-nowrap"><span class="text-emerald-700 font-bold text-xs">● ${l.status}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function renderAdminLoginLogs() {
    renderModalLoginLogs();
}

function clearLoginAuditLogs() {
    if (confirm('Are you sure you want to clear all user login activity logs?')) {
        localStorage.removeItem('ayur_login_logs');
        renderModalLoginLogs();
        showToast('Login audit logs cleared.');
    }
}



// ----------------------------------------------------
// EXPORT TO EXCEL COMPATIBLE CSV (UTF-8 BOM ENCODED)
// ----------------------------------------------------
function exportLoginLogsToExcel() {
    let logs = [];
    try {
        logs = JSON.parse(localStorage.getItem('ayur_login_logs') || '[]');
        if (!Array.isArray(logs)) logs = [];
    } catch(e) { logs = []; }

    if (logs.length === 0) {
        alert('No login audit logs available to export.');
        return;
    }

    // \uFEFF is the UTF-8 Byte Order Mark (BOM) so Microsoft Excel opens the file with correct column formatting and characters!
    let csv = '\uFEFFLog ID,User Full Name,Email / Mobile ID,Portal Role,Login Date & Time,Device Platform,Session Status\r\n';

    logs.forEach(l => {
        const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
        csv += `${escape(l.id)},${escape(l.name)},${escape(l.email)},${escape(l.role)},${escape(l.loginTime)},${escape(l.device)},${escape(l.status)}\r\n`;
    });

    const fileName = `AyurAyush_User_Login_Logs_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(csv, fileName);
    showToast('Login logs exported to Excel CSV successfully!');
}

function exportPatientsToExcel() {
    let db = [];
    try {
        db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
        if (!Array.isArray(db)) db = [];
    } catch(e) { db = []; }

    if (db.length === 0) {
        alert('No patient clinical records available to export.');
        return;
    }

    let csv = '\uFEFFToken ID,Patient Full Name,Age,Gender,Mobile / ABHA ID,BP (mmHg),Pulse Rate (bpm),SpO2 (%),Temperature (F),Ayurvedic Agni,Chief Complaint,Ayurvedic Diagnosis\r\n';

    db.forEach(p => {
        const escape = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
        const bp = p.vitals ? p.vitals.bp : '138/88';
        const pulse = p.vitals ? p.vitals.pulse : '78';
        const spo2 = p.vitals ? p.vitals.spo2 : '97';
        const temp = p.vitals ? p.vitals.temp : '98.6';
        const agni = p.ayush ? p.ayush.agni : 'Manda (Low)';
        csv += `${escape(p.tokenId)},${escape(p.name)},${escape(p.age)},${escape(p.gender)},${escape(p.phone)},${escape(bp)},${escape(pulse)},${escape(spo2)},${escape(temp)},${escape(agni)},${escape(p.complaint)},${escape(p.diag || 'Kaphaja Kasa')}\r\n`;
    });

    const fileName = `AyurAyush_Patient_Clinical_Cases_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsvFile(csv, fileName);
    showToast('Patient cases exported to Excel CSV successfully!');
}

function downloadCsvFile(content, fileName) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ----------------------------------------------------
// 9. CORE ROLE SWITCHER
// ----------------------------------------------------
function switchRole(role) {
    appState.currentRole = role;
    
    // Hide all views
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.add('hidden');
        sec.style.display = 'none';
    });
    
    // Reset all nav role buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('bg-teal-700', 'text-white', 'shadow-sm', 'active-role');
        btn.classList.add('text-slate-600');
    });

    const activeView = document.getElementById(`view-${role}`);
    const activeBtn = document.getElementById(`nav-btn-${role}`);

    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.style.display = 'block';
    }
    if (activeBtn) {
        activeBtn.classList.add('bg-teal-700', 'text-white', 'shadow-sm', 'active-role');
        activeBtn.classList.remove('text-slate-600');
    }

    if (role === 'doctor') {
        updateDoctorDashboard();
    } else if (role === 'admin') {
        renderAdminRecords();
    }
}

// ----------------------------------------------------
// 10. VOICE & LANGUAGE CONTROLS
// ----------------------------------------------------
function changeLanguage() {
    const el = document.getElementById('kiosk-lang');
    if (el) appState.currentLang = el.value;
    if (recognition) recognition.lang = appState.currentLang;
}

function toggleVoiceAssistant() {
    appState.voiceAssistantActive = !appState.voiceAssistantActive;
    const btnText = document.getElementById('voice-btn-text');
    if (btnText) btnText.innerText = appState.voiceAssistantActive ? 'Voice Assistant ON' : 'Voice Assistant OFF';
}

function toggleSpeechRecognition() {
    if (!recognition) {
        alert('Speech recognition is not supported in this browser. Please type symptoms manually.');
        return;
    }

    if (appState.isListening) {
        recognition.stop();
        stopMicAnimation();
    } else {
        try {
            recognition.lang = appState.currentLang;
            recognition.start();
            appState.isListening = true;
            const ind = document.getElementById('mic-indicator');
            const title = document.getElementById('mic-status-title');
            if (ind) ind.classList.remove('hidden');
            if (title) title.innerText = 'Listening now... Speak your symptoms!';
        } catch (e) { console.error(e); }
    }
}

function stopMicAnimation() {
    appState.isListening = false;
    const ind = document.getElementById('mic-indicator');
    const title = document.getElementById('mic-status-title');
    if (ind) ind.classList.add('hidden');
    if (title) title.innerText = 'Tap Mic to Speak in Hindi / English';
}

// ----------------------------------------------------
// 11. TOAST NOTIFICATION UTILITY
// ----------------------------------------------------
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-teal-800 text-white text-xs font-bold rounded-xl shadow-2xl transition-all';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}
