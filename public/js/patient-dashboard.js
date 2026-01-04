/**
 * Patient Dashboard - World Class Experience
 * HIE Uganda - Patient Portal
 * Features: Calendar, Editable Profile, Photo Upload, Activity Logging
 */

(function() {
    'use strict';

    // =========================================================================
    // State Management
    // =========================================================================
    const state = {
        patient: null,
        patientId: null,
        appointments: [],
        medicalRecords: [],
        currentSection: 'overview',
        calendarDate: new Date(),
        selectedCalendarDate: null,
        isEditMode: false
    };

    // =========================================================================
    // Authentication Config
    // =========================================================================
    const AUTH_CONFIG = {
        TOKEN_KEY: 'hie_token',
        USER_KEY: 'hie_user'
    };

    // =========================================================================
    // DOM Ready
    // =========================================================================
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        if (!checkAuth()) return;
        setupNavigation();
        setupDate();
        setupCalendar();
        setupProfileEdit();
        setupPhotoUpload();
        loadDashboardData();
        logActivity('view', 'dashboard', 'Patient accessed dashboard');
    }

    // =========================================================================
    // Authentication
    // =========================================================================
    function getUser() {
        try {
            const userStr = localStorage.getItem(AUTH_CONFIG.USER_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    }

    function getAuthToken() {
        return localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    }

    function checkAuth() {
        const token = getAuthToken();
        const user = getUser();

        if (!token || !user) {
            window.location.href = '/login.html';
            return false;
        }

        if (user.role !== 'patient') {
            if (user.role === 'admin') {
                window.location.href = '/admin.html';
            } else {
                window.location.href = '/dashboard.html';
            }
            return false;
        }

        state.patientId = user.patient_id || user.id;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }

        return true;
    }

    function handleLogout() {
        logActivity('logout', 'session', 'Patient logged out');
        setTimeout(() => {
            localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
            localStorage.removeItem(AUTH_CONFIG.USER_KEY);
            window.location.href = '/login.html';
        }, 200);
    }

    // =========================================================================
    // Activity Logging
    // =========================================================================
    async function logActivity(action, resource, details) {
        try {
            await fetch('/api/patients/activity', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ action, resource, details })
            });
        } catch (e) {
            console.log('Activity logging failed:', e);
        }
    }

    // =========================================================================
    // Navigation
    // =========================================================================
    function setupNavigation() {
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.section);
            });
        });

        document.querySelectorAll('[data-section]').forEach(el => {
            if (!el.classList.contains('nav-item')) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigateTo(el.dataset.section);
                });
            }
        });
    }

    function navigateTo(sectionId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionId) {
                item.classList.add('active');
            }
        });

        document.querySelectorAll('[id^="section-"]').forEach(section => {
            section.classList.add('section-hidden');
        });

        const target = document.getElementById(`section-${sectionId}`);
        if (target) {
            target.classList.remove('section-hidden');
        }

        const titles = {
            'overview': 'Overview',
            'appointments': 'Appointments',
            'records': 'Medical Records',
            'profile': 'My Profile'
        };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = titles[sectionId] || 'Dashboard';

        state.currentSection = sectionId;
        logActivity('view', sectionId, `Viewed ${sectionId} section`);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =========================================================================
    // Date Display
    // =========================================================================
    function setupDate() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('en-US', options);
        }

        const welcomeEl = document.getElementById('welcomeText');
        if (welcomeEl) {
            const hour = new Date().getHours();
            let greeting = 'Good morning';
            if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
            if (hour >= 17) greeting = 'Good evening';
            welcomeEl.textContent = `${greeting}, Patient`;
        }
    }

    // =========================================================================
    // Calendar
    // =========================================================================
    function setupCalendar() {
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
            renderCalendar();
        });

        document.getElementById('nextMonth')?.addEventListener('click', () => {
            state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    function renderCalendar() {
        const calMonthYear = document.getElementById('calMonthYear');
        const calDays = document.getElementById('calendarDays');
        if (!calMonthYear || !calDays) return;

        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();

        calMonthYear.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Get appointments for this month
        const monthAppts = state.appointments.filter(a => {
            const d = new Date(a.appointment_date || a.date);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        // Build appointment map by day
        const apptMap = {};
        monthAppts.forEach(a => {
            const d = new Date(a.appointment_date || a.date).getDate();
            if (!apptMap[d]) apptMap[d] = [];
            apptMap[d].push(a);
        });

        let html = '';

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            html += '<div class="cal-day empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const hasAppt = apptMap[day];
            const isSelected = state.selectedCalendarDate && 
                state.selectedCalendarDate.getFullYear() === year && 
                state.selectedCalendarDate.getMonth() === month && 
                state.selectedCalendarDate.getDate() === day;

            let classes = 'cal-day';
            if (isToday) classes += ' today';
            if (hasAppt) classes += ' has-appointment';
            if (isSelected) classes += ' selected';

            let dots = '';
            if (hasAppt) {
                const statuses = [...new Set(hasAppt.map(a => (a.status || 'scheduled').toLowerCase()))];
                dots = '<div class="cal-dots">' + statuses.map(s => `<span class="cal-dot ${s}"></span>`).join('') + '</div>';
            }

            html += `<div class="${classes}" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}">${day}${dots}</div>`;
        }

        calDays.innerHTML = html;

        // Add click handlers
        calDays.querySelectorAll('.cal-day:not(.empty)').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                const dateStr = dayEl.dataset.date;
                state.selectedCalendarDate = new Date(dateStr + 'T00:00:00');
                renderCalendar();
                showAppointmentsForDate(dateStr);
            });
        });
    }

    function showAppointmentsForDate(dateStr) {
        const detailsContent = document.getElementById('appointmentDetailsContent');
        const detailsTitle = document.getElementById('detailsPanelTitle');
        if (!detailsContent || !detailsTitle) return;

        const date = new Date(dateStr + 'T00:00:00');
        detailsTitle.textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        const dayAppts = state.appointments.filter(a => {
            const d = new Date(a.appointment_date || a.date);
            return d.toISOString().split('T')[0] === dateStr;
        });

        if (dayAppts.length === 0) {
            detailsContent.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <p>No appointments on this date</p>
                </div>`;
        } else {
            detailsContent.innerHTML = dayAppts.map(a => createDetailedAppointmentCard(a)).join('');
        }

        logActivity('view', 'calendar_date', `Viewed appointments for ${dateStr}`);
    }

    function createDetailedAppointmentCard(appt) {
        const time = appt.appointment_time || appt.time || '09:00';
        const type = appt.appointment_type || appt.type || 'General Checkup';
        const provider = appt.provider_name || appt.doctor || 'Healthcare Provider';
        const facility = appt.facility_name || appt.facility || 'Medical Center';
        const status = appt.status || 'scheduled';
        const notes = appt.notes || appt.reason || '';

        return `
            <div class="appointment-detail-card">
                <div class="appt-detail-header">
                    <span class="appt-detail-time"><i class="fas fa-clock"></i> ${formatTime(time)}</span>
                    <span class="appt-status ${status.toLowerCase()}">${status}</span>
                </div>
                <h4 class="appt-detail-type">${type}</h4>
                <div class="appt-detail-info">
                    <p><i class="fas fa-user-md"></i> ${provider}</p>
                    <p><i class="fas fa-hospital"></i> ${facility}</p>
                    ${notes ? `<p class="appt-notes"><i class="fas fa-sticky-note"></i> ${notes}</p>` : ''}
                </div>
            </div>`;
    }

    // =========================================================================
    // Profile Edit
    // =========================================================================
    function setupProfileEdit() {
        const editBtn = document.getElementById('editProfileBtn');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const editForm = document.getElementById('profileEditForm');

        editBtn?.addEventListener('click', enterEditMode);
        cancelBtn?.addEventListener('click', exitEditMode);
        editForm?.addEventListener('submit', saveProfile);
    }

    function enterEditMode() {
        state.isEditMode = true;
        document.getElementById('profileViewMode')?.classList.add('edit-mode-hidden');
        document.getElementById('profileEditMode')?.classList.remove('edit-mode-hidden');
        document.getElementById('editProfileBtn')?.classList.add('edit-mode-hidden');
        populateEditForm();
        logActivity('edit_start', 'profile', 'Started editing profile');
    }

    function exitEditMode() {
        state.isEditMode = false;
        document.getElementById('profileViewMode')?.classList.remove('edit-mode-hidden');
        document.getElementById('profileEditMode')?.classList.add('edit-mode-hidden');
        document.getElementById('editProfileBtn')?.classList.remove('edit-mode-hidden');
    }

    function populateEditForm() {
        const p = state.patient;
        if (!p) return;

        // Use camelCase with snake_case fallback
        setValue('editFirstName', p.firstName || p.first_name);
        setValue('editLastName', p.lastName || p.last_name);
        setValue('editContact', p.contactNumber || p.contact_number);
        setValue('editAddress', p.address);
        setValue('editDistrict', p.district);
        setValue('editVillage', p.village);
        setValue('editNIN', p.nin);
        setValue('editNationality', p.nationality);
        setValue('editTribe', p.tribe);
        setValue('editBloodGroup', p.bloodGroup || p.blood_group);
        setValue('editGenotype', p.genotype);
        setValue('editHeight', p.height);
        setValue('editWeight', p.weight);
        setValue('editEyeColor', p.eyeColor || p.eye_color);
        setValue('editHairColor', p.hairColor || p.hair_color);
        setValue('editSkinTone', p.skinTone || p.skin_tone);
        
        const foodAllergies = p.foodAllergies || p.food_allergies || [];
        const medAllergies = p.medicationAllergies || p.medication_allergies || [];
        const conditions = p.chronicConditions || p.chronic_conditions || [];
        
        setValue('editFoodAllergies', Array.isArray(foodAllergies) ? foodAllergies.join(', ') : foodAllergies);
        setValue('editMedAllergies', Array.isArray(medAllergies) ? medAllergies.join(', ') : medAllergies);
        setValue('editConditions', Array.isArray(conditions) ? conditions.join(', ') : conditions);
        
        setValue('editNOKName', p.nextOfKinName || p.next_of_kin_name);
        setValue('editNOKRelation', p.nextOfKinRelationship || p.next_of_kin_relationship);
        setValue('editNOKContact', p.nextOfKinContact || p.next_of_kin_contact);
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    async function saveProfile(e) {
        e.preventDefault();
        const saveBtn = document.getElementById('saveProfileBtn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const data = {
            firstName: document.getElementById('editFirstName')?.value,
            lastName: document.getElementById('editLastName')?.value,
            contactNumber: document.getElementById('editContact')?.value,
            nin: document.getElementById('editNIN')?.value,
            address: document.getElementById('editAddress')?.value,
            district: document.getElementById('editDistrict')?.value,
            village: document.getElementById('editVillage')?.value,
            nationality: document.getElementById('editNationality')?.value,
            tribe: document.getElementById('editTribe')?.value,
            bloodGroup: document.getElementById('editBloodGroup')?.value,
            genotype: document.getElementById('editGenotype')?.value,
            height: parseFloat(document.getElementById('editHeight')?.value) || null,
            weight: parseFloat(document.getElementById('editWeight')?.value) || null,
            eyeColor: document.getElementById('editEyeColor')?.value,
            hairColor: document.getElementById('editHairColor')?.value,
            skinTone: document.getElementById('editSkinTone')?.value,
            foodAllergies: document.getElementById('editFoodAllergies')?.value.split(',').map(s => s.trim()).filter(Boolean),
            medicationAllergies: document.getElementById('editMedAllergies')?.value.split(',').map(s => s.trim()).filter(Boolean),
            chronicConditions: document.getElementById('editConditions')?.value.split(',').map(s => s.trim()).filter(Boolean),
            nextOfKinName: document.getElementById('editNOKName')?.value,
            nextOfKinRelationship: document.getElementById('editNOKRelation')?.value,
            nextOfKinContact: document.getElementById('editNOKContact')?.value
        };

        try {
            const response = await fetch(`/api/patients/${state.patientId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                state.patient = await response.json();
                renderPatientInfo();
                exitEditMode();
                showToast('Profile updated successfully!', 'success');
                logActivity('update', 'profile', 'Profile information updated');
            } else {
                const err = await response.json();
                showToast(err.error || 'Failed to update profile', 'error');
            }
        } catch (error) {
            showToast('Failed to update profile', 'error');
        }

        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }

    // =========================================================================
    // Photo Upload
    // =========================================================================
    function setupPhotoUpload() {
        const photoInput = document.getElementById('photoUpload');
        photoInput?.addEventListener('change', handlePhotoUpload);
    }

    async function handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be less than 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
            const base64 = event.target.result;

            try {
                const response = await fetch(`/api/patients/${state.patientId}/photo`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({ photo: base64 })
                });

                if (response.ok) {
                    state.patient.photo = base64;
                    updateAvatars(base64);
                    showToast('Profile photo updated!', 'success');
                    logActivity('update', 'photo', 'Profile photo changed');
                } else {
                    showToast('Failed to update photo', 'error');
                }
            } catch (error) {
                showToast('Failed to upload photo', 'error');
            }
        };
        reader.readAsDataURL(file);
    }

    function updateAvatars(src) {
        ['sidebarAvatar', 'profileAvatar', 'fullProfileAvatar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = src;
        });
    }

    // =========================================================================
    // Data Loading
    // =========================================================================
    async function loadDashboardData() {
        try {
            await Promise.all([
                loadPatientInfo(),
                loadAppointments(),
                loadMedicalRecords()
            ]);
            updateStats();
            renderCalendar();
        } catch (error) {
            console.error('Dashboard load error:', error);
        }
    }

    async function loadPatientInfo() {
        if (!state.patientId) return;

        try {
            const response = await fetch(`/api/patients/${state.patientId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                state.patient = await response.json();
                renderPatientInfo();
            }
        } catch (error) {
            console.error('Patient info error:', error);
        }
    }

    async function loadAppointments() {
        if (!state.patientId) return;

        try {
            const response = await fetch(`/api/appointments/patient/${state.patientId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                const data = await response.json();
                state.appointments = Array.isArray(data) ? data : (data.appointments || []);
                renderAppointments();
            }
        } catch (error) {
            console.error('Appointments error:', error);
        }
    }

    async function loadMedicalRecords() {
        if (!state.patientId) return;

        try {
            const response = await fetch(`/api/medical-records/patient/${state.patientId}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });

            if (response.ok) {
                const data = await response.json();
                state.medicalRecords = Array.isArray(data) ? data : (data.records || []);
                renderMedicalRecords();
                updateVitals();
            }
        } catch (error) {
            console.error('Records error:', error);
        }
    }

    // =========================================================================
    // Rendering - Patient Info
    // =========================================================================
    function renderPatientInfo() {
        const p = state.patient;
        if (!p) return;

        // API returns camelCase - support both formats for compatibility
        const firstName = p.firstName || p.first_name || '';
        const lastName = p.lastName || p.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || 'Patient';
        const initials = getInitials(fullName);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0891b2&color=fff&size=240`;
        const avatarUrl = p.photo || defaultAvatar;

        // Update greeting
        const welcomeEl = document.getElementById('welcomeText');
        if (welcomeEl) {
            const hour = new Date().getHours();
            let greeting = 'Good morning';
            if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
            if (hour >= 17) greeting = 'Good evening';
            welcomeEl.textContent = `${greeting}, ${firstName || 'Patient'}`;
        }

        // Update all avatars
        updateAvatars(avatarUrl);

        // Sidebar user
        setTextContent('sidebarName', fullName);

        // Get values with camelCase fallback
        const gender = p.gender || 'N/A';
        const bloodGroup = p.bloodGroup || p.blood_group || '--';
        const email = p.email || '--';
        const dateOfBirth = p.dateOfBirth || p.date_of_birth;
        const contactNumber = p.contactNumber || p.contact_number || '--';
        const address = p.address || '--';
        const district = p.district || '--';
        const village = p.village || '--';
        const nin = p.nin || '--';
        const genotype = p.genotype || '--';
        const height = p.height;
        const weight = p.weight;
        const bmi = p.bmi;
        const bmiCategory = p.bmiCategory || p.bmi_category;
        const eyeColor = p.eyeColor || p.eye_color || '--';
        const hairColor = p.hairColor || p.hair_color || '--';
        const skinTone = p.skinTone || p.skin_tone || '--';
        const nationality = p.nationality || '--';
        const tribe = p.tribe || '--';
        const foodAllergies = p.foodAllergies || p.food_allergies || [];
        const medAllergies = p.medicationAllergies || p.medication_allergies || [];
        const conditions = p.chronicConditions || p.chronic_conditions || [];
        const medHistory = p.medicalHistory || p.medical_history || [];
        const nokName = p.nextOfKinName || p.next_of_kin_name || '--';
        const nokRelation = p.nextOfKinRelationship || p.next_of_kin_relationship || '--';
        const nokContact = p.nextOfKinContact || p.next_of_kin_contact || '--';

        // Full profile page header
        setTextContent('fullProfileName', fullName);
        setTextContent('fullProfileEmail', email);
        setTextContent('fullProfileGender', gender);
        setTextContent('fullProfileBlood', `Blood: ${bloodGroup}`);

        if (dateOfBirth) {
            const age = calculateAge(dateOfBirth);
            setTextContent('fullProfileAge', `Age: ${age}`);
        }

        // Detail rows (view mode) - Personal Information
        setTextContent('detailFirstName', firstName || '--');
        setTextContent('detailLastName', lastName || '--');
        setTextContent('detailDOB', formatDate(dateOfBirth) || '--');
        setTextContent('detailGender', gender);
        setTextContent('detailContact', contactNumber);
        setTextContent('detailEmail', email);
        setTextContent('detailNIN', nin);
        setTextContent('detailAddress', address);
        setTextContent('detailDistrict', district);
        setTextContent('detailVillage', village);
        setTextContent('detailNationality', nationality);
        setTextContent('detailTribe', tribe);

        // Medical Information
        setTextContent('detailBloodGroup', bloodGroup);
        setTextContent('detailGenotype', genotype);
        setTextContent('detailHeight', height ? `${height} cm` : '--');
        setTextContent('detailWeight', weight ? `${weight} kg` : '--');
        setTextContent('detailBMI', bmi ? `${bmi} (${bmiCategory || 'N/A'})` : '--');
        setTextContent('detailEyeColor', eyeColor);
        setTextContent('detailHairColor', hairColor);
        setTextContent('detailSkinTone', skinTone);
        
        // Format arrays for display
        const foodAllergyStr = Array.isArray(foodAllergies) && foodAllergies.length > 0 
            ? foodAllergies.join(', ') : 'None reported';
        const medAllergyStr = Array.isArray(medAllergies) && medAllergies.length > 0 
            ? medAllergies.join(', ') : 'None reported';
        const conditionsStr = Array.isArray(conditions) && conditions.length > 0 
            ? conditions.join(', ') : 'None reported';
        const medHistoryStr = Array.isArray(medHistory) && medHistory.length > 0 
            ? medHistory.join(', ') : 'None reported';
        
        setTextContent('detailFoodAllergies', foodAllergyStr);
        setTextContent('detailMedAllergies', medAllergyStr);
        setTextContent('detailConditions', conditionsStr);
        setTextContent('detailMedHistory', medHistoryStr);

        // Emergency Contact
        setTextContent('detailNOKName', nokName);
        setTextContent('detailNOKRelation', nokRelation);
        setTextContent('detailNOKContact', nokContact);
    }

    // =========================================================================
    // Rendering - Appointments
    // =========================================================================
    function renderAppointments() {
        const appts = state.appointments;
        const now = new Date();

        const upcoming = appts.filter(a => {
            const date = new Date(a.appointment_date || a.date);
            return date >= now && a.status !== 'cancelled';
        }).sort((a, b) => new Date(a.appointment_date || a.date) - new Date(b.appointment_date || b.date));

        const badge = document.getElementById('navApptBadge');
        if (badge) {
            badge.textContent = upcoming.length;
            badge.style.display = upcoming.length > 0 ? 'inline-flex' : 'none';
        }

        const listEl = document.getElementById('appointmentsList');
        if (listEl) {
            if (upcoming.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>No upcoming appointments</p>
                    </div>`;
            } else {
                listEl.innerHTML = upcoming.slice(0, 3).map(a => createAppointmentItem(a)).join('');
            }
        }

        const allListEl = document.getElementById('allAppointmentsList');
        if (allListEl) {
            const sorted = [...appts].sort((a, b) => 
                new Date(b.appointment_date || b.date) - new Date(a.appointment_date || a.date)
            );

            if (sorted.length === 0) {
                allListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <p>No appointments found</p>
                    </div>`;
            } else {
                allListEl.innerHTML = sorted.map(a => createAppointmentItem(a)).join('');
            }
        }

        renderCalendar();
    }

    function createAppointmentItem(appt) {
        const date = new Date(appt.appointment_date || appt.date);
        const day = date.getDate();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const time = appt.appointment_time || appt.time || '09:00';
        const type = appt.appointment_type || appt.type || 'General';
        const provider = appt.provider_name || appt.doctor || 'Doctor';
        const status = appt.status || 'scheduled';

        const statusClass = {
            'scheduled': 'scheduled',
            'confirmed': 'confirmed',
            'completed': 'completed',
            'cancelled': 'cancelled'
        }[status.toLowerCase()] || 'scheduled';

        return `
            <div class="appointment-item">
                <div class="appt-date-badge">
                    <div class="appt-day">${day}</div>
                    <div class="appt-month">${month}</div>
                </div>
                <div class="appt-details">
                    <div class="appt-title">${type}</div>
                    <div class="appt-meta">
                        <span><i class="fas fa-clock"></i> ${formatTime(time)}</span>
                        <span><i class="fas fa-user-md"></i> ${provider}</span>
                    </div>
                </div>
                <span class="appt-status ${statusClass}">${status}</span>
            </div>`;
    }

    // =========================================================================
    // Rendering - Medical Records
    // =========================================================================
    function renderMedicalRecords() {
        const records = state.medicalRecords;

        const sorted = [...records].sort((a, b) => 
            new Date(b.visit_date || b.date || b.created_at) - new Date(a.visit_date || a.date || a.created_at)
        );

        const listEl = document.getElementById('recordsList');
        if (listEl) {
            if (sorted.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <p>No medical records found</p>
                    </div>`;
            } else {
                listEl.innerHTML = sorted.slice(0, 3).map(r => createRecordItem(r)).join('');
            }
        }

        const allListEl = document.getElementById('allRecordsList');
        if (allListEl) {
            if (sorted.length === 0) {
                allListEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-folder-open"></i>
                        <p>No medical records found</p>
                    </div>`;
            } else {
                allListEl.innerHTML = sorted.map(r => createRecordItem(r)).join('');
            }
        }
    }

    function createRecordItem(record) {
        const date = formatDate(record.visit_date || record.date || record.created_at);
        const diagnosis = record.diagnosis || record.title || 'Medical Visit';
        const provider = record.provider_name || record.doctor || 'Healthcare Provider';
        const facility = record.facility_name || record.facility || '';

        let icon = 'fa-file-medical';
        const type = (record.record_type || record.type || '').toLowerCase();
        if (type.includes('lab')) icon = 'fa-flask';
        if (type.includes('imaging') || type.includes('xray')) icon = 'fa-x-ray';
        if (type.includes('prescription')) icon = 'fa-prescription';

        return `
            <div class="record-item">
                <div class="record-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="record-details">
                    <div class="record-title">${diagnosis}</div>
                    <div class="record-meta">
                        <span><i class="fas fa-user-md"></i> ${provider}</span>
                        ${facility ? `<span><i class="fas fa-hospital"></i> ${facility}</span>` : ''}
                    </div>
                </div>
                <div class="record-date">${date}</div>
            </div>`;
    }

    // =========================================================================
    // Stats & Vitals
    // =========================================================================
    function updateStats() {
        const upcoming = state.appointments.filter(a => {
            const date = new Date(a.appointment_date || a.date);
            return date >= new Date() && a.status !== 'cancelled';
        });
        setTextContent('statAppointments', upcoming.length);
        setTextContent('statRecords', state.medicalRecords.length);

        let medsCount = 0;
        state.medicalRecords.forEach(r => {
            if (r.prescription && Array.isArray(r.prescription)) {
                medsCount += r.prescription.length;
            } else if (r.medications && Array.isArray(r.medications)) {
                medsCount += r.medications.length;
            }
        });
        setTextContent('statMeds', medsCount);

        if (state.medicalRecords.length > 0) {
            const sorted = [...state.medicalRecords].sort((a, b) => 
                new Date(b.visit_date || b.date || b.created_at) - new Date(a.visit_date || a.date || a.created_at)
            );
            const lastDate = new Date(sorted[0].visit_date || sorted[0].date || sorted[0].created_at);
            setTextContent('statLastVisit', formatShortDate(lastDate));

            const daysAgo = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            const trendEl = document.getElementById('statLastVisitTrend');
            if (trendEl) {
                if (daysAgo === 0) {
                    trendEl.innerHTML = '<i class="fas fa-check"></i> Today';
                } else if (daysAgo === 1) {
                    trendEl.innerHTML = '<i class="fas fa-history"></i> Yesterday';
                } else {
                    trendEl.innerHTML = `<i class="fas fa-history"></i> ${daysAgo}d ago`;
                }
            }
        }
    }

    function updateVitals() {
        const records = state.medicalRecords.filter(r => 
            r.vitals || r.blood_pressure || r.heart_rate || r.temperature
        );

        if (records.length === 0) return;

        const latest = records.sort((a, b) => 
            new Date(b.visit_date || b.date || b.created_at) - new Date(a.visit_date || a.date || a.created_at)
        )[0];

        const vitals = latest.vitals || latest;

        if (vitals.blood_pressure || vitals.bp) {
            setTextContent('vitalBP', vitals.blood_pressure || vitals.bp);
        }
        if (vitals.heart_rate || vitals.pulse) {
            setTextContent('vitalHR', `${vitals.heart_rate || vitals.pulse} bpm`);
        }
        if (vitals.temperature || vitals.temp) {
            setTextContent('vitalTemp', `${vitals.temperature || vitals.temp}°C`);
        }
        if (vitals.weight) {
            setTextContent('vitalWeight', `${vitals.weight} kg`);
        }
    }

    // =========================================================================
    // Toast Notifications
    // =========================================================================
    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // =========================================================================
    // Utility Functions
    // =========================================================================
    function setTextContent(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getInitials(name) {
        return name.split(' ')
            .map(part => part.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'P';
    }

    function calculateAge(dateString) {
        const birth = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    function formatDate(dateString) {
        if (!dateString) return '--';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    function formatShortDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatTime(timeString) {
        if (!timeString) return '--';
        const [hours, minutes] = timeString.split(':');
        const h = parseInt(hours);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${suffix}`;
    }

})();
