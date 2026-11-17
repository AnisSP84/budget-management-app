// ========== DOM ELEMENTS ==========
const darkModeToggle = document.getElementById('darkModeToggle');
const budgetNotificationToggle = document.getElementById('budgetNotificationToggle');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdValue = document.getElementById('thresholdValue');
const thresholdContainer = document.getElementById('thresholdContainer');
const countrySelect = document.getElementById('countrySelect');
const currencyPreview = document.getElementById('currencyPreview');
const settingsName = document.getElementById('settingsName');
const settingsUsername = document.getElementById('settingsUsername');
const settingsEmail = document.getElementById('settingsEmail');
const settingsPassword = document.getElementById('settingsPassword');
const settingsDob = document.getElementById('settingsDob');
const settingsOccupation = document.getElementById('settingsOccupation');
const toastMsg = document.getElementById('toastMsg');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const togglePasswordBtn = document.getElementById('togglePassword');

// ========== API CONFIGURATION ==========
const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api/settings`;

// ========== HELPER FUNCTIONS ==========
function getAuthToken() {
  return localStorage.getItem('token');
}

// ========== API HELPER FUNCTIONS ==========
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// ========== STATE VARIABLES ==========
let darkModeEnabled = false;
let budgetNotificationsEnabled = false;
let warningThreshold = 80;
let country = 'SG';
let currentUserData = {};

// ========== HELPER FUNCTIONS ==========
function showMessage(message, isError = false) {
  toastMsg.textContent = message;
  if (isError) toastMsg.classList.add('error');
  else toastMsg.classList.remove('error');
  toastMsg.style.display = 'block';
  setTimeout(() => {
    toastMsg.style.display = 'none';
  }, 2500);
}

function updateCurrencyPreview() {
  const selectedCountry = countrySelect.value;
  const currencyData = window.currencyData || {};
  const currencyInfo = currencyData[selectedCountry];
  if (currencyPreview && currencyInfo) {
    currencyPreview.innerHTML = `💰 Exchange rate: 1 SGD = ${currencyInfo.rate ? currencyInfo.rate.toFixed(2) : 'N/A'} ${currencyInfo.symbol}`;
  }
}

// ========== DARK MODE ==========
function applyDarkMode() {
  if (darkModeEnabled) {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
    darkModeToggle.classList.add('active');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
    darkModeToggle.classList.remove('active');
  }
}

async function handleDarkModeClick() {
  darkModeEnabled = !darkModeEnabled;

  try {
    await apiRequest('/preferences', 'PATCH', {
      darkMode: darkModeEnabled,
    });

    localStorage.setItem('darkMode', darkModeEnabled);

    applyDarkMode();
  } catch (error) {
    console.error(error);
    darkModeEnabled = !darkModeEnabled;
    showMessage('Failed to update dark mode setting', true);
  }
}

// ========== BUDGET NOTIFICATIONS ==========
function applyBudgetNotifications() {
  if (budgetNotificationsEnabled) {
    budgetNotificationToggle.classList.add('active');
    thresholdContainer.classList.remove('hidden');
  } else {
    budgetNotificationToggle.classList.remove('active');
    thresholdContainer.classList.add('hidden');
  }
}

async function handleBudgetNotificationClick() {
  budgetNotificationsEnabled = !budgetNotificationsEnabled;

  try {
    await apiRequest('/preferences', 'PATCH', {
      budgetNotification: budgetNotificationsEnabled,
    });

    applyBudgetNotifications();
  } catch (error) {
    console.error(error);
    budgetNotificationsEnabled = !budgetNotificationsEnabled;
    showMessage('Failed to update budget notification setting', true);
  }
}

// ========== THRESHOLD SLIDER ==========
function applyThreshold() {
  thresholdSlider.value = warningThreshold;
  thresholdValue.textContent = warningThreshold + '%';
}

async function handleThresholdChange() {
  warningThreshold = parseInt(thresholdSlider.value);
  thresholdValue.textContent = warningThreshold + '%';

  try {
    await apiRequest('/preferences', 'PATCH', {
      warningThreshold: warningThreshold,
    });
  } catch (error) {
    console.error(error);
    showMessage('Failed to update threshold setting', true);
  }
}

// ========== COUNTRY ==========
async function handleCountryChange() {
  country = countrySelect.value;

  try {
    await apiRequest('/preferences', 'PATCH', {
      countryCode: country,
    });

    // Save to localStorage so other pages can read it
    localStorage.setItem('country', country);

    updateCurrencyPreview();
    showMessage('Country updated successfully. Refresh other pages to see changes.');
  } catch (error) {
    console.error(error);
    showMessage('Failed to update country setting', true);
  }
}

// ========== SHOW/HIDE PASSWORD ==========
function initPasswordToggle() {
  if (togglePasswordBtn && settingsPassword) {
    togglePasswordBtn.addEventListener('click', function () {
      const type = settingsPassword.getAttribute('type') === 'password' ? 'text' : 'password';
      settingsPassword.setAttribute('type', type);
      this.textContent = type === 'password' ? '👁️' : '🙈';
    });
  }
}

// ========== PROFILE ==========
async function saveProfile() {
  const newName = settingsName.value.trim();
  const newUsername = settingsUsername.value.trim();
  const newEmail = settingsEmail.value.trim();
  const newPassword = settingsPassword.value;
  const newDob = settingsDob.value;
  const newOccupation = settingsOccupation.value.trim();

  const nameSame = newName === '' || newName === currentUserData.name;
  const usernameSame = newUsername === '' || newUsername === currentUserData.username;
  const emailSame = newEmail === '' || newEmail === currentUserData.email;
  const passwordSame = newPassword === '';
  const dobSame = newDob === '' || newDob === currentUserData.dob;
  const occupationSame = newOccupation === '' || newOccupation === currentUserData.occupation;

  if (nameSame && usernameSame && emailSame && passwordSame && dobSame && occupationSame) {
    showMessage('No changes detected. Please enter new values to update.', true);
    return;
  }

  const updates = {};
  const updatedFields = [];

  if (newName !== '' && !nameSame) {
    updates.name = newName;
    updatedFields.push('Name');
  }

  if (newUsername !== '' && !usernameSame) {
    updates.username = newUsername;
    updatedFields.push('Username');
  }

  if (newEmail !== '' && !emailSame) {
    if (!newEmail.includes('@')) {
      showMessage("Invalid email address. Email must contain '@' symbol.", true);
      return;
    }
    updates.email = newEmail;
    updatedFields.push('Email address');
  }

  if (newPassword !== '') {
    updates.password = newPassword;
    updatedFields.push('Password');
  }

  if (newDob !== '' && !dobSame) {
    updates.dob = newDob;
    updatedFields.push('Date of Birth');
  }

  if (newOccupation !== '' && !occupationSame) {
    updates.occupation = newOccupation;
    updatedFields.push('Occupation');
  }

  if (Object.keys(updates).length === 0) {
    showMessage('No changes detected. Please enter new values to update.', true);
    return;
  }

  try {
    await apiRequest('/profile', 'PATCH', updates);

    let successMessage = '';

    if (updatedFields.length === 6) {
      successMessage = 'All profile information updated successfully!';
    } else if (updatedFields.length === 5) {
      successMessage = `${updatedFields[0]}, ${updatedFields[1]}, ${updatedFields[2]}, ${updatedFields[3]} and ${updatedFields[4]} updated.`;
    } else if (updatedFields.length === 4) {
      successMessage = `${updatedFields[0]}, ${updatedFields[1]}, ${updatedFields[2]} and ${updatedFields[3]} updated.`;
    } else if (updatedFields.length === 3) {
      successMessage = `${updatedFields[0]}, ${updatedFields[1]} and ${updatedFields[2]} updated.`;
    } else if (updatedFields.length === 2) {
      successMessage = `${updatedFields[0]} and ${updatedFields[1]} updated.`;
    } else if (updatedFields.length === 1) {
      successMessage = `${updatedFields[0]} updated.`;
    }

    showMessage(successMessage);
    settingsPassword.value = '';
    await loadAllSettings();
  } catch (error) {
    showMessage('Failed to update profile: ' + error.message, true);
  }
}

// ========== LOAD ALL SETTINGS ==========
async function loadAllSettings() {
  try {
    const response = await apiRequest('/all');

    if (response.success && response.data) {
      const data = response.data;

      currentUserData = {
        name: data.name || '',
        username: data.username || '',
        email: data.email || '',
        dob: data.dob || '',
        occupation: data.occupation || '',
      };

      if (settingsName) settingsName.value = data.name || '';
      if (settingsUsername) settingsUsername.value = data.username || '';
      if (settingsEmail) settingsEmail.value = data.email || '';
      if (settingsDob) settingsDob.value = data.dob || '';
      if (settingsOccupation) settingsOccupation.value = data.occupation || '';

      darkModeEnabled = data.dark_mode === true;
      budgetNotificationsEnabled = data.budget_notification === true;
      warningThreshold = data.warning_threshold || 80;
      country = data.country_code || 'SG';

      // Save to localStorage so other pages can read it
      localStorage.setItem('country', country);

      applyDarkMode();
      applyBudgetNotifications();
      applyThreshold();

      if (countrySelect) {
        countrySelect.value = country;
      }

      if (data.currencyData) {
        window.currencyData = {};
        Object.keys(data.currencyData).forEach((key) => {
          window.currencyData[key] = {
            ...data.currencyData[key],
            rate: data.exchangeRates ? data.exchangeRates[key] : 1,
          };
        });
      }

      updateCurrencyPreview();
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showMessage('Failed to load settings. Please try refreshing the page.', true);
  }
}

// ========== INITIALIZE ==========
async function init() {
  try {
    await loadAllSettings();
    setupEventListeners();
    initPasswordToggle();
    console.log('Settings page initialized');
  } catch (error) {
    console.error('Settings initialization failed:', error);
  }
}

// ========== SETUP EVENT LISTENERS ==========
function setupEventListeners() {
  darkModeToggle.onclick = handleDarkModeClick;
  budgetNotificationToggle.onclick = handleBudgetNotificationClick;
  thresholdSlider.oninput = handleThresholdChange;
  countrySelect.onchange = handleCountryChange;

  if (saveProfileBtn) {
    saveProfileBtn.onclick = saveProfile;
  }
}

// Start the app
init();
