/**
 * AyurAyush AI - Smart OPD Case-Taking Software
 * Core Application Engine - Bulletproof UI & Dependency Safe Guards
 */

// Application State
const appState = {
    currentUser: { name: 'Ramesh Kumar', role: 'kiosk' },
    currentRole: 'kiosk',
    pendingAccessRole: null,
    doctorScannedPatient: null,
    currentLang: 'hi-IN',
    voiceAssistantActive: true,
    isListening: false,
    selectedCategory: 'respiratory',
    selectedBodyZone: { name: 'Chest / Lungs', code: 'chest' },
    painScale: 4,
    prakriti: { vata: 32, pitta: 16, kapha: 52 },
    currentPatient: {
        tokenId: 'AY-2026-8942',
        name: 'Ramesh Kumar',
        age: 45,
        gender: 'Male',
        phone: '+91 98765 43210',
        vitals: { bp: '138/88', pulse: 78, spo2: 97, temp: 98.6 },
        complaint: 'Cough with whitish sputum for 3 days, mild fever (99.8°F), loss of appetite, aggravated during night time.',
        ayush: { agni: 'Manda (Low Digestion)', koshtha: 'Madhyama (Normal Bowel)', sleep: 'Disturbed / Night Cough' }
    },
    prescriptions: [
        { remedy: 'Sitopaladi Churna', dosage: '3 grams twice daily with Honey', freq: 'BID', duration: '5 Days' },
        { remedy: 'Kanthasudha Vati', dosage: '1 Tablet chewable as needed', freq: 'PRN', duration: '5 Days' }
    ]
};

let prakritiChart = null;

// Speech Engine Safe Init
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
            showToast('Speech Transcribed: ' + transcript);
            stopMicAnimation();
        };

        recognition.onerror = function() { stopMicAnimation(); };
        recognition.onend = function() { stopMicAnimation(); };
    } catch(e) { console.warn('Speech API init warning:', e); }
}

// Initializer with Full Exception Safeguard
document.addEventListener('DOMContentLoaded', () => {
    try {
        switchRole('kiosk');
    } catch(e) { console.error('switchRole err:', e); }

    try {
        runSplashScreen();
    } catch(e) { console.error('splash err:', e); }

    try {
        renderAdaptiveQuestions('respiratory');
    } catch(e) { console.error('adaptive err:', e); }

    try {
        renderPrescriptionTable();
    } catch(e) { console.error('rx table err:', e); }

    try {
        loadDatabaseRecords();
    } catch(e) { console.error('db err:', e); }

    setTimeout(() => {
        try { initChart(); } catch(e) { console.warn('Chart init delayed/offline:', e); }
    }, 300);
});

// ----------------------------------------------------
// 1. SPLASH SCREEN INTRO
// ----------------------------------------------------
function runSplashScreen() {
    const splash = document.getElementById('splash-screen');
    const progress = document.getElementById('splash-progress');
    const statusText = document.getElementById('splash-status-text');

    if (!splash) return;

    setTimeout(() => { if(progress) progress.style.width = '40%'; if(statusText) statusText.innerText = 'Loading Clinical Engine...'; }, 600);
    setTimeout(() => { if(progress) progress.style.width = '80%'; if(statusText) statusText.innerText = 'Initializing Database...'; }, 1800);
    setTimeout(() => { if(progress) progress.style.width = '100%'; if(statusText) statusText.innerText = 'Ready!'; }, 2700);

    setTimeout(() => {
        splash.classList.add('opacity-0');
        setTimeout(() => {
            splash.classList.add('hidden');
            splash.style.display = 'none';
            checkUserSession();
        }, 700);
    }, 3000);
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

function handleLogin(e) {
    if (e) e.preventDefault();
    const emailEl = document.getElementById('login-email');
    const roleEl = document.getElementById('login-role');
    const passEl = document.getElementById('login-pass');

    const email = emailEl ? emailEl.value : 'patient@hospital.com';
    const role = roleEl ? roleEl.value : 'kiosk';
    const pass = passEl ? passEl.value : '';

    if (role === 'doctor' && pass !== 'moment123' && pass !== '1234') {
        alert('Incorrect Doctor Password! Use "moment123".');
        return;
    }

    appState.currentUser = { name: email.split('@')[0] || 'User', email: email, role: role };
    localStorage.setItem('ayur_current_user', JSON.stringify(appState.currentUser));
    
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.add('hidden');
        authScreen.style.display = 'none';
    }
    
    updateUserDisplay();

    if (role === 'doctor') {
        attemptDoctorAccess('doctor');
    } else if (role === 'admin') {
        attemptDoctorAccess('admin');
    } else {
        switchRole('kiosk');
    }
    showToast('Signed in successfully!');
}

function handleSignup(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const role = document.getElementById('signup-role').value;
    const pass = document.getElementById('signup-pass').value;

    let users = JSON.parse(localStorage.getItem('ayur_users') || '[]');
    users.push({ name, email, role, pass });
    localStorage.setItem('ayur_users', JSON.stringify(users));

    const alertEl = document.getElementById('signup-success-alert');
    if(alertEl) { alertEl.classList.remove('hidden'); alertEl.style.display = 'block'; }

    document.getElementById('login-email').value = email;
    document.getElementById('login-role').value = role;
    document.getElementById('login-pass').value = '';

    setTimeout(() => {
        switchAuthTab('login');
        showToast('Account created! Please sign in with your password.');
    }, 800);
}

function quickDemoLogin(role) {
    let name = 'Ramesh Kumar (Patient)';
    if (role === 'doctor') name = 'Dr. V. K. Sharma';
    else if (role === 'admin') name = 'OPD Administrator';

    appState.currentUser = { name, email: `${role}@hospital.com`, role };
    localStorage.setItem('ayur_current_user', JSON.stringify(appState.currentUser));

    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.add('hidden');
        authScreen.style.display = 'none';
    }
    
    updateUserDisplay();

    if (role === 'doctor') {
        attemptDoctorAccess('doctor');
    } else if (role === 'admin') {
        attemptDoctorAccess('admin');
    } else {
        switchRole('kiosk');
    }
}

function logoutUser() {
    localStorage.removeItem('ayur_current_user');
    appState.currentUser = null;
    appState.doctorScannedPatient = null;
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) {
        authScreen.classList.remove('hidden');
        authScreen.style.display = 'flex';
    }
}

function updateUserDisplay() {
    if (!appState.currentUser) return;
    const nameEl = document.getElementById('user-display-name');
    const roleEl = document.getElementById('user-display-role');
    if (nameEl) nameEl.innerText = appState.currentUser.name;
    if (roleEl) roleEl.innerText = `${appState.currentUser.role.toUpperCase()} ACCESS`;
}

// ----------------------------------------------------
// 3. MANDATORY PASSWORD SECURITY ("moment123")
// ----------------------------------------------------
function attemptDoctorAccess(targetRole) {
    appState.pendingAccessRole = targetRole;
    const titleEl = document.getElementById('lock-modal-title');
    const inputEl = document.getElementById('lock-pass-input');
    const errEl = document.getElementById('lock-error-text');
    const modalEl = document.getElementById('password-lock-modal');

    if (titleEl) titleEl.innerText = targetRole === 'doctor' ? 'Doctor Workspace Password Required' : 'Database Records Password Required';
    if (inputEl) inputEl.value = '';
    if (errEl) { errEl.classList.add('hidden'); errEl.style.display = 'none'; }
    if (modalEl) { modalEl.classList.remove('hidden'); modalEl.style.display = 'flex'; }
}

function verifyPagePassword() {
    const inputEl = document.getElementById('lock-pass-input');
    const typed = inputEl ? inputEl.value : '';
    const role = appState.pendingAccessRole;

    if (role === 'doctor' && (typed === 'moment123' || typed === '1234')) {
        closePasswordLockModal();
        switchRole('doctor');
        showToast('Doctor Workspace Unlocked!');
    } else if (role === 'admin' && (typed === 'admin123' || typed === 'moment123' || typed === '5678')) {
        closePasswordLockModal();
        switchRole('admin');
        showToast('Database Records Unlocked!');
    } else {
        const errEl = document.getElementById('lock-error-text');
        if (errEl) { errEl.classList.remove('hidden'); errEl.style.display = 'block'; }
    }
}

function closePasswordLockModal() {
    const modalEl = document.getElementById('password-lock-modal');
    if (modalEl) { modalEl.classList.add('hidden'); modalEl.style.display = 'none'; }
}

// ----------------------------------------------------
// 4. SIDEBAR & THEME
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
    attemptDoctorAccess('admin');
}

function setAppTheme(theme) {
    const body = document.getElementById('body-root');
    if (!body) return;
    body.className = body.className.replace(/theme-\w+/g, '').trim();

    if (theme === 'emerald') body.classList.add('theme-emerald');
    else if (theme === 'sky') body.classList.add('theme-sky');
    else if (theme === 'dark') body.classList.add('theme-dark');

    showToast(`App theme set to ${theme.toUpperCase()}`);
}

// ----------------------------------------------------
// 5. PATIENT KIOSK SUBMISSION & QR SLIP MODAL
// ----------------------------------------------------
function submitPatientKiosk() {
    const nameVal = document.getElementById('patient-name')?.value || 'Ramesh Kumar';
    const ageVal = document.getElementById('patient-age')?.value || 45;
    const genderVal = document.getElementById('patient-gender')?.value || 'Male';
    const phoneVal = document.getElementById('patient-phone')?.value || '+91 98765 43210';
    const complaintVal = document.getElementById('chief-complaint-text')?.value || 'Cough with whitish sputum for 3 days';

    appState.currentPatient.name = nameVal;
    appState.currentPatient.age = ageVal;
    appState.currentPatient.gender = genderVal;
    appState.currentPatient.phone = phoneVal;
    appState.currentPatient.complaint = complaintVal;

    appState.currentPatient.vitals = {
        bp: document.getElementById('vital-bp')?.value || '138/88',
        pulse: document.getElementById('vital-pulse')?.value || 78,
        spo2: document.getElementById('vital-spo2')?.value || 97,
        temp: document.getElementById('vital-temp')?.value || 98.6
    };

    let db = [];
    try {
        db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
        if (!Array.isArray(db)) db = [];
    } catch (e) { db = []; }

    db = db.filter(r => r.tokenId !== appState.currentPatient.tokenId);
    db.unshift(appState.currentPatient);
    localStorage.setItem('ayur_db', JSON.stringify(db));

    renderPatientQrModal();
    renderAdminRecords();
    showToast('Saved to Database! Opening Patient OPD QR Slip.');
}

function renderPatientQrModal() {
    const container = document.getElementById('modal-qrcode-container');
    if (container) {
        container.innerHTML = '';
        if (window.QRCode) {
            try {
                new QRCode(container, {
                    text: `AIIA-OPD:${appState.currentPatient.tokenId}|NAME:${appState.currentPatient.name}`,
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
    if (pName) pName.innerText = `${appState.currentPatient.name} (${appState.currentPatient.age}${appState.currentPatient.gender.charAt(0)})`;
    if (bpEl) bpEl.innerText = appState.currentPatient.vitals.bp;
    if (spo2El) spo2El.innerText = appState.currentPatient.vitals.spo2 + '%';
    if (symEl) symEl.innerText = appState.currentPatient.complaint;

    const modal = document.getElementById('patient-qr-modal');
    if (modal) modal.classList.remove('hidden');
}

function closePatientQrModal() {
    const modal = document.getElementById('patient-qr-modal');
    if (modal) modal.classList.add('hidden');
}

function switchToDoctorAndScan() {
    closePatientQrModal();
    attemptDoctorAccess('doctor');
}

// ----------------------------------------------------
// 6. DOCTOR QR SCANNER MODAL & SCAN EXECUTION
// ----------------------------------------------------
function openDoctorQrScannerModal() {
    const scannerBox = document.getElementById('scanner-qrcode-box');
    if (scannerBox) {
        scannerBox.innerHTML = '';
        if (window.QRCode) {
            try {
                new QRCode(scannerBox, {
                    text: `AIIA-OPD:${appState.currentPatient.tokenId}|NAME:${appState.currentPatient.name}`,
                    width: 128,
                    height: 128,
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
                    <div onclick="selectScanTarget('${p.tokenId}')" class="p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-lg cursor-pointer flex justify-between items-center ${idx === 0 ? 'border-teal-500 bg-teal-50' : ''}">
                        <span class="font-bold text-slate-900">${p.name} <span class="font-mono text-teal-800">(${p.tokenId})</span></span>
                        <span class="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">Scan QR</span>
                    </div>
                `;
            });
        }
        list.innerHTML = html;
    }

    const modal = document.getElementById('qr-scanner-modal');
    if (modal) modal.classList.remove('hidden');
}

function selectScanTarget(tokenId) {
    let db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
    const target = db.find(p => p.tokenId === tokenId);
    if (target) {
        appState.currentPatient = target;
        showToast(`Selected Patient QR: ${target.name}`);
    }
}

function executeQrScanLoad() {
    closeQrScannerModal();
    appState.doctorScannedPatient = appState.currentPatient;
    updateDoctorDashboard();
    showToast('QR Code Scanned! Patient history loaded into Doctor SOAP.');
}

function closeQrScannerModal() {
    const modal = document.getElementById('qr-scanner-modal');
    if (modal) modal.classList.add('hidden');
}

// ----------------------------------------------------
// 7. DOCTOR WORKSPACE & PRESCRIPTION
// ----------------------------------------------------
function updateDoctorDashboard() {
    const emptyState = document.getElementById('doctor-empty-state');
    const soapContent = document.getElementById('doctor-soap-content');

    if (!appState.doctorScannedPatient) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (soapContent) soapContent.classList.add('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (soapContent) soapContent.classList.remove('hidden');

    const tokenEl = document.getElementById('doc-view-token');
    const subjEl = document.getElementById('soap-subjective');
    const objEl = document.getElementById('soap-objective');

    if (tokenEl) tokenEl.innerText = appState.doctorScannedPatient.tokenId;
    if (subjEl) subjEl.innerText = `Patient ${appState.doctorScannedPatient.name} (${appState.doctorScannedPatient.age}${appState.doctorScannedPatient.gender ? appState.doctorScannedPatient.gender.charAt(0) : 'M'}) reports: ${appState.doctorScannedPatient.complaint}`;
    if (objEl) objEl.innerText = `Vitals: BP ${appState.doctorScannedPatient.vitals ? appState.doctorScannedPatient.vitals.bp : '138/88'}, Pulse ${appState.doctorScannedPatient.vitals ? appState.doctorScannedPatient.vitals.pulse : 78} bpm, SpO2 ${appState.doctorScannedPatient.vitals ? appState.doctorScannedPatient.vitals.spo2 : 97}%. Digestion: Low | Body Type: Kapha ${appState.prakriti.kapha}%.`;
    
    renderPrescriptionTable();
    generateQRCode(appState.doctorScannedPatient.tokenId);
}

function generateQRCode(tokenId) {
    const container = document.getElementById('qrcode-display');
    if (!container) return;
    container.innerHTML = '';
    if (window.QRCode) {
        try {
            new QRCode(container, {
                text: `AIIA-OPD:${tokenId}|NAME:${appState.currentPatient.name}`,
                width: 128,
                height: 128,
                colorDark: "#0f766e",
                colorLight: "#ffffff"
            });
        } catch(e) {}
    }
}

function renderPrescriptionTable() {
    const container = document.getElementById('prescription-table-container');
    if (!container) return;
    let html = `<table class="w-full text-left"><thead><tr class="text-slate-600 border-b border-slate-200"><th class="py-1 font-bold">Remedy</th><th class="py-1 font-bold">Dosage</th><th class="py-1 font-bold">Freq</th><th class="py-1 font-bold">Duration</th></tr></thead><tbody>`;
    appState.prescriptions.forEach(rx => {
        html += `<tr><td class="py-1 font-bold text-amber-900">${rx.remedy}</td><td class="py-1 font-medium">${rx.dosage}</td><td class="py-1 font-medium">${rx.freq}</td><td class="py-1 text-teal-800 font-bold">${rx.duration}</td></tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function toggleDoctorDictation() {
    const el = document.getElementById('doc-dictation-log');
    if (el) el.value = 'Dictation: "Add Sitopaladi Churna 3g twice daily with honey for 5 days."';
    showToast('Doctor dictation captured!');
}

function processDictationToRx() {
    appState.prescriptions.unshift({ remedy: 'Sitopaladi Churna', dosage: '3g with Honey', freq: 'BID', duration: '5 Days' });
    renderPrescriptionTable();
    showToast('Parsed dictation into prescription!');
}

function simulateScanQR() {
    openDoctorQrScannerModal();
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
            html += `<tr><td class="p-2 font-bold">${rx.remedy}</td><td class="p-2">${rx.dosage}</td><td class="p-2">${rx.freq}</td><td class="p-2">${rx.duration}</td></tr>`;
        });
        tbody.innerHTML = html;
    }

    const modal = document.getElementById('print-modal');
    if (modal) modal.classList.remove('hidden');
}

function closePrintModal() {
    const modal = document.getElementById('print-modal');
    if (modal) modal.classList.add('hidden');
}

// ----------------------------------------------------
// 8. DATABASE RECORDS & FALLBACK RENDERER
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
    showToast('Database reset to initial sample records!');
}

function renderAdminRecords() {
    const tbody = document.getElementById('admin-records-table-body');
    if (!tbody) return;

    let db = [];
    try {
        db = JSON.parse(localStorage.getItem('ayur_db') || '[]');
        if (!Array.isArray(db)) db = [];
    } catch (e) { db = []; }

    if (db.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="p-6 text-center text-slate-500 font-semibold bg-slate-50">
                    <p class="text-sm font-bold text-slate-700">No patient records found in database.</p>
                    <button onclick="resetDatabaseToDefault()" class="mt-2 px-4 py-2 bg-teal-700 text-white text-xs font-bold rounded-xl shadow">Reset Sample Database Records</button>
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
                <td class="p-3 font-mono font-bold text-teal-800">${tokenId}</td>
                <td class="p-3 font-bold text-slate-900">${name}</td>
                <td class="p-3 font-semibold text-slate-700">${age}/${genderStr}</td>
                <td class="p-3 text-slate-700 font-mono text-[11px]">BP: ${vitalsBp} | SpO2: ${vitalsSpo2}%</td>
                <td class="p-3 text-slate-600 font-medium max-w-xs truncate">${complaint}</td>
                <td class="p-3 text-amber-800 font-bold">${diag}</td>
                <td class="p-3">
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
        attemptDoctorAccess('doctor');
    }
}

// ----------------------------------------------------
// 9. CORE SWITCH ROLE (GUARANTEES NO BLANK SCREEN)
// ----------------------------------------------------
function switchRole(role) {
    appState.currentRole = role;
    
    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.classList.add('hidden');
        sec.style.display = 'none';
    });
    
    // De-activate all role buttons
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('bg-teal-700', 'text-white', 'shadow-sm');
        btn.classList.add('text-slate-600');
    });

    const activeView = document.getElementById(`view-${role}`);
    const activeBtn = document.getElementById(`nav-btn-${role}`);

    if (activeView) {
        activeView.classList.remove('hidden');
        activeView.style.display = 'block';
    }
    if (activeBtn) {
        activeBtn.classList.add('bg-teal-700', 'text-white', 'shadow-sm');
        activeBtn.classList.remove('text-slate-600');
    }

    if (role === 'doctor') {
        updateDoctorDashboard();
    } else if (role === 'admin') {
        renderAdminRecords();
    }
}

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
        alert('Speech recognition is not supported in this browser. Please type complaints manually.');
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

function selectCategory(cat) {
    appState.selectedCategory = cat;
    renderAdaptiveQuestions(cat);
    if (cat === 'respiratory') selectBodyZone('Chest / Lungs', 'chest');
    else if (cat === 'joint') selectBodyZone('Knees & Joints', 'legs');
    else if (cat === 'digestive') selectBodyZone('Abdomen', 'abdomen');
    else if (cat === 'fever') selectBodyZone('Head', 'head');
}

function renderAdaptiveQuestions(cat) {
    const container = document.getElementById('adaptive-question-container');
    if (!container) return;
    let html = '';

    if (cat === 'respiratory') {
        html = `
            <div class="p-3 bg-slate-50 rounded-xl border border-teal-200 text-xs space-y-1">
                <label class="font-bold text-teal-800 block">🧠 Sputum & Cough Type (Kasa)</label>
                <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center space-x-2 cursor-pointer font-medium"><input type="radio" name="rq1" checked onclick="updateKasaType('Kapha')"><span>White Sputum (Kaphaja)</span></label>
                    <label class="flex items-center space-x-2 cursor-pointer font-medium"><input type="radio" name="rq1" onclick="updateKasaType('Vata')"><span>Dry Cough (Vataja)</span></label>
                </div>
            </div>
        `;
    } else if (cat === 'joint') {
        html = `
            <div class="p-3 bg-slate-50 rounded-xl border border-amber-200 text-xs space-y-1">
                <label class="font-bold text-amber-800 block">🧠 Morning Joint Stiffness (Amavata)</label>
                <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center space-x-2 cursor-pointer font-medium"><input type="radio" name="jq1" checked><span>Stiffness > 1 Hour</span></label>
                    <label class="flex items-center space-x-2 cursor-pointer font-medium"><input type="radio" name="jq1"><span>Pain with Movement</span></label>
                </div>
            </div>
        `;
    } else {
        html = `
            <div class="p-3 bg-slate-50 rounded-xl border border-sky-200 text-xs space-y-1">
                <label class="font-bold text-sky-800 block">🧠 Stomach & Acid Reflux (Amlapitta)</label>
                <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center space-x-2 cursor-pointer font-medium"><input type="radio" name="dq1" checked><span>Chest Burning</span></label>
                    <label class="flex items-center space-x-2 cursor-pointer font-medium"><input type="radio" name="dq1"><span>Loss of Appetite</span></label>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

function updateKasaType(type) {
    appState.prakriti = type === 'Kapha' ? { vata: 25, pitta: 20, kapha: 55 } : { vata: 60, pitta: 25, kapha: 15 };
    updateChartData();
}

function selectBodyZone(name, code) {
    appState.selectedBodyZone = { name, code };
    const el = document.getElementById('selected-zone-name');
    if (el) el.innerText = name;
}

function updatePainScaleDisplay() {
    const slider = document.getElementById('pain-scale-slider');
    const val = slider ? slider.value : 4;
    appState.painScale = val;
    const el = document.getElementById('pain-scale-val');
    if (el) el.innerText = `Level ${val} - Moderate Pain`;
}

function initChart() {
    const canvas = document.getElementById('prakritiChart');
    if (!canvas || !window.Chart) return;
    try {
        const ctx = canvas.getContext('2d');
        prakritiChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Vata (Air)', 'Pitta (Fire)', 'Kapha (Water)'],
                datasets: [{
                    label: 'Body Type %',
                    data: [appState.prakriti.vata, appState.prakriti.pitta, appState.prakriti.kapha],
                    backgroundColor: 'rgba(13, 148, 136, 0.25)',
                    borderColor: '#0d9488',
                    pointBackgroundColor: '#0f766e',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { angleLines: { color: 'rgba(0,0,0,0.1)' }, grid: { color: 'rgba(0,0,0,0.1)' }, ticks: { display: false } } },
                plugins: { legend: { display: false } }
            }
        });
    } catch(e) {}
}

function recalculatePrakriti() {
    const agniEl = document.getElementById('ayush-agni');
    const agni = agniEl ? agniEl.value : '';
    let v = 30, p = 30, k = 40;
    if (agni.includes('Manda') || agni.includes('Low')) k += 20;
    const total = v + p + k;
    appState.prakriti = { vata: Math.round((v/total)*100), pitta: Math.round((p/total)*100), kapha: Math.round((k/total)*100) };
    updateChartData();
}

function updateChartData() {
    if (!prakritiChart) return;
    try {
        prakritiChart.data.datasets[0].data = [appState.prakriti.vata, appState.prakriti.pitta, appState.prakriti.kapha];
        prakritiChart.update();
    } catch(e) {}
    const tag = document.getElementById('dosha-imbalance-tag');
    if (tag) tag.innerText = `Kapha ${appState.prakriti.kapha}%, Vata ${appState.prakriti.vata}%`;
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-teal-800 text-white text-xs font-bold rounded-xl shadow-2xl animate-bounce';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}
