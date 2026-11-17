// API Configuration
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;
let notifications = [];
let budgetNotificationsEnabled = false;
let warningThreshold = 80;

// Helper function to get JWT token from localStorage
function getAuthToken() {
  return localStorage.getItem('token');
}

// API Call function with authentication
async function apiCall(endpoint, method = 'GET', data = null) {
  const token = getAuthToken();

  if (!token) {
    console.warn('No authentication token found');
    showMessage('Please login to view notifications', true);
    return null;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        showMessage('Session expired. Please login again.', true);
      }
      throw new Error(result.message || 'API call failed');
    }
    return result;
  } catch (error) {
    console.error('API Error:', error);
    showMessage(error.message, true);
    throw error;
  }
}

function showMessage(message, isError = false) {
  const toast = document.getElementById('toastMsg');
  if (!toast) return;
  toast.textContent = message;
  if (isError) {
    toast.classList.add('error');
  } else {
    toast.classList.remove('error');
  }
  toast.style.display = 'block';
  setTimeout(() => {
    if (toast) toast.style.display = 'none';
  }, 3000);
}

function loadDarkMode() {
  const savedDarkMode = localStorage.getItem('darkMode');
  if (savedDarkMode === 'true') {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
  }
}

// Load settings from localStorage (for budget notification preferences)
function loadSettings() {
  const savedBudget = localStorage.getItem('budgetNotifications');
  budgetNotificationsEnabled = savedBudget === 'true';

  const savedThreshold = localStorage.getItem('warningThreshold');
  warningThreshold = savedThreshold ? parseInt(savedThreshold) : 80;

  console.log('Notifications settings loaded:', { budgetNotificationsEnabled, warningThreshold });
}

// ========== BACKEND API FUNCTIONS ==========

// Load notifications from backend only
async function loadNotificationsFromBackend() {
  const container = document.getElementById('notificationList');
  if (!container) return;

  // First, check if budget notifications are enabled
  if (!budgetNotificationsEnabled) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-title">Notifications are turned off</div>
        <div style="font-size: 12px; margin-top: 8px;">Enable budget notifications in Settings to receive alerts when you're near or over your budget.</div>
      </div>
    `;
    return;
  }

  // Show loading state
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">⏳</div>
      <div class="empty-state-title">Loading notifications...</div>
    </div>
  `;

  try {
    const result = await apiCall('/notifications/unread');
    if (result && result.success && result.data) {
      // Load ALL notifications from backend, not just unread
      // We need to fetch all notifications, not just unread
      // For now, we'll use the unread endpoint but we should change to /all
      notifications = (result.data.notifications || []).map((notif) => ({
        id: notif.notification_id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        time: notif.created_at,
        read: notif.read,
      }));
      renderNotifications();

      if (result.data.counts) {
        localStorage.setItem('unreadNotificationCount', result.data.counts.unread);
      }
    } else {
      notifications = [];
      renderNotifications();
    }
  } catch (error) {
    console.error('Failed to load notifications from backend:', error);
    notifications = [];
    renderNotifications();
    showMessage('Could not load notifications. Please try again later.', true);
  }
}

// Mark a single notification as read via backend
// eslint-disable-next-line no-unused-vars
async function markAsRead(id) {
  try {
    const result = await apiCall(`/notifications/${id}/read`, 'PUT');
    if (result && result.success) {
      const notification = notifications.find((n) => n.id === id);
      if (notification) {
        notification.read = true;
        renderNotifications();
        showMessage('Notification marked as read');
      }
    }
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    showMessage('Failed to mark notification as read', true);
  }
}

// Mark all notifications as read via backend
async function markAllAsRead() {
  try {
    const result = await apiCall('/notifications/read-all', 'PUT');
    if (result && result.success) {
      notifications.forEach((n) => (n.read = true));
      renderNotifications();
      showMessage('All notifications marked as read');
    }
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    showMessage('Failed to mark all as read', true);
  }
}

// Clear all notifications via backend
async function clearAllNotifications() {
  try {
    const result = await apiCall('/notifications/all', 'DELETE');
    if (result && result.success) {
      notifications = [];
      renderNotifications();
      showMessage('All notifications cleared');
    }
  } catch (error) {
    console.error('Failed to clear notifications:', error);
    showMessage('Failed to clear notifications', true);
  }
}

// Format time for display
function formatTime(timestamp) {
  if (!timestamp) return 'Unknown time';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function getNotificationIcon(type) {
  switch (type) {
    case 'warning':
      return '⚠️';
    case 'danger':
      return '🔴';
    case 'info':
      return 'ℹ️';
    default:
      return '📢';
  }
}

function getIconClass(type) {
  switch (type) {
    case 'warning':
      return 'warning';
    case 'danger':
      return 'danger';
    default:
      return 'info';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderNotifications() {
  const container = document.getElementById('notificationList');
  if (!container) return;

  // If budget notifications are disabled, show message
  if (!budgetNotificationsEnabled) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-title">Notifications are turned off</div>
        <div style="font-size: 12px; margin-top: 8px;">Enable budget notifications in Settings to receive alerts when you're near or over your budget.</div>
      </div>
    `;
    return;
  }

  // Show ALL notifications (both read and unread)
  if (notifications.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-title">No notifications</div>
        <div style="font-size: 12px; margin-top: 8px;">You don't have any notifications yet.</div>
      </div>
    `;
    return;
  }

  // Display all notifications, mark read ones differently
  container.innerHTML = notifications
    .map(
      (notification) => `
    <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
      <div class="notification-icon ${getIconClass(notification.type)}">
        ${getNotificationIcon(notification.type)}
      </div>
      <div class="notification-content">
        <div class="notification-title">${escapeHtml(notification.title)}</div>
        <div class="notification-message">${escapeHtml(notification.message)}</div>
        <div class="notification-time">${formatTime(notification.time)}</div>
        ${notification.read ? '<div style="font-size: 11px; color: #888; margin-top: 4px;">✓ Read</div>' : ''}
      </div>
      ${!notification.read ? `<button class="mark-read-btn" onclick="markAsRead(${notification.id})">Mark read</button>` : ''}
    </div>
  `,
    )
    .join('');
}

// Listen for changes from settings page
function listenForSettingsChanges() {
  window.addEventListener('storage', (e) => {
    if (e.key === 'darkMode') {
      if (e.newValue === 'true') {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
      }
    }

    if (e.key === 'budgetNotifications') {
      budgetNotificationsEnabled = e.newValue === 'true';
      console.log('Budget notifications setting updated:', budgetNotificationsEnabled);
      // Reload notifications when setting changes
      loadNotificationsFromBackend();
    }

    if (e.key === 'warningThreshold') {
      warningThreshold = parseInt(e.newValue);
    }
  });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM loaded, initializing notifications...');

  loadDarkMode();
  loadSettings();
  listenForSettingsChanges();

  // Load notifications from backend
  await loadNotificationsFromBackend();

  const markAllBtn = document.getElementById('markAllReadBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');

  if (markAllBtn) markAllBtn.addEventListener('click', markAllAsRead);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllNotifications);

  console.log(
    'Notifications initialization complete. Budget notifications enabled:',
    budgetNotificationsEnabled,
  );
});
