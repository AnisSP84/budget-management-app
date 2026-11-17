// Dark Mode Manager - Syncs with backend API

function applyDarkMode(isDark) {
  if (isDark) {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
  }
}

async function loadDarkMode() {
  const token = localStorage.getItem('token');

  // If no token, fall back to localStorage
  if (!token) {
    const savedDarkMode = localStorage.getItem('darkMode');
    applyDarkMode(savedDarkMode === 'true');
    return;
  }

  try {
    // Fetch dark mode setting from backend
    const response = await fetch('/api/settings/all', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        applyDarkMode(data.data.dark_mode === true);
        // Also update localStorage as fallback
        localStorage.setItem('darkMode', data.data.dark_mode === true);
        return;
      }
    }
  } catch (error) {
    console.error('Failed to load dark mode from backend:', error);
  }

  // Fallback to localStorage if API fails
  const savedDarkMode = localStorage.getItem('darkMode');
  applyDarkMode(savedDarkMode === 'true');
}

// Listen for dark mode changes from other tabs
function listenForDarkModeChanges() {
  window.addEventListener('storage', (e) => {
    if (e.key === 'darkMode') {
      applyDarkMode(e.newValue === 'true');
    }
  });
}

// Initialize
loadDarkMode();
listenForDarkModeChanges();
