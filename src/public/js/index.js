/**
 * index.js - Handles homepage functionality including button visibility
 * based on user authentication status
 */

// ============================================
// AuthButtonRenderer Class
// ============================================
class AuthButtonRenderer {
  /**
   * Create a new AuthButtonRenderer instance
   * @param {string} containerId - The ID of the container element
   */
  constructor(containerId = 'authButtons') {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`❌ Container element with ID "${containerId}" not found`);
      return;
    }

    // Bind methods
    this.render = this.render.bind(this);
    this.isUserLoggedIn = this.isUserLoggedIn.bind(this);
    this.getUserData = this.getUserData.bind(this);

    // Initial render
    this.render();

    console.log('✅ AuthButtonRenderer initialized');
  }

  /**
   * Check if user is currently logged in
   * @returns {boolean} True if user is logged in, false otherwise
   */
  isUserLoggedIn() {
    // Check multiple possible token storage keys
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('accessToken');

    // Also check for user data
    const userData =
      localStorage.getItem('userData') ||
      localStorage.getItem('user') ||
      sessionStorage.getItem('userData');

    return !!(token || userData);
  }

  /**
   * Get user data from storage
   * @returns {Object|null} User data object or null if not found
   */
  getUserData() {
    const userData =
      localStorage.getItem('userData') ||
      localStorage.getItem('user') ||
      sessionStorage.getItem('userData');
    if (userData) {
      try {
        return typeof userData === 'string' ? JSON.parse(userData) : userData;
      } catch (e) {
        console.warn('Failed to parse userData:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Get user's display name
   * @returns {string} User's display name
   */
  getUserDisplayName() {
    const userData = this.getUserData();
    if (userData) {
      if (userData.name) return userData.name;
      if (userData.first_name) return userData.first_name;
      if (userData.email) return userData.email.split('@')[0];
      if (userData.username) return userData.username;
    }
    return null;
  }

  /**
   * Generate guest buttons HTML (Login & Register)
   * @returns {string} HTML string for guest buttons
   */
  renderGuestButtons() {
    return `
            <a href="login.html" class="btn btn-outline-dark btn-lg px-4"> Login </a>
            <a href="register.html" class="btn btn-dark btn-lg px-4"> Register </a>
        `;
  }

  /**
   * Generate logged-in buttons HTML (Dashboard & Transactions)
   * @returns {string} HTML string for logged-in buttons
   */
  renderLoggedInButtons() {
    return `
            <a href="dashboard.html" class="btn btn-dark btn-lg px-4"> Dashboard </a>
            <a href="transactions.html" class="btn btn-outline-dark btn-lg px-4"> Transactions </a>
        `;
  }

  /**
   * Render the appropriate buttons based on auth status
   */
  render() {
    if (!this.container) {
      console.error('❌ Container not available for rendering');
      return;
    }

    const isLoggedIn = this.isUserLoggedIn();
    console.log(`🔄 Rendering buttons - Logged in: ${isLoggedIn}`);

    let html;
    let welcomeMessage = document.getElementById('welcomeMessage');
    let welcomeSubtitle = document.getElementById('welcomeSubtitle');

    if (isLoggedIn) {
      // Show logged-in buttons
      html = this.renderLoggedInButtons();

      // Update welcome message with user's name
      const displayName = this.getUserDisplayName();
      if (welcomeMessage) {
        if (displayName) {
          welcomeMessage.textContent = `Welcome back, ${displayName}!`;
        } else {
          welcomeMessage.textContent = 'Welcome back to MOSS Finance Tracker!';
        }
      }
      if (welcomeSubtitle) {
        welcomeSubtitle.textContent = 'Ready to track your finances and achieve your goals?';
      }
    } else {
      // Show guest buttons
      html = this.renderGuestButtons();

      // Reset welcome message to default
      if (welcomeMessage) {
        welcomeMessage.textContent = 'Welcome to MOSS Finance Tracker';
      }
      if (welcomeSubtitle) {
        welcomeSubtitle.textContent =
          'Track your spending, manage budgets, and build better financial habits.';
      }
    }

    // Update the container with new HTML
    this.container.innerHTML = html;

    // Update display classes
    this.container.className = 'btn-group-hero d-flex flex-wrap justify-content-center gap-2';
  }

  /**
   * Handle login - stores user data and re-renders
   * @param {Object} userData - User data to store
   * @param {string} token - Authentication token
   */
  handleLogin(userData, token) {
    console.log('🔐 Login handler called');

    // Store user data and token
    if (userData) {
      localStorage.setItem('userData', JSON.stringify(userData));
    }
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
    }

    // Re-render buttons
    this.render();

    // Dispatch login event for other components
    document.dispatchEvent(
      new CustomEvent('login', {
        detail: { userData, token },
      }),
    );
  }

  /**
   * Handle logout - clears user data and re-renders
   */
  handleLogout() {
    console.log('🚪 Logout handler called');

    // Clear all authentication-related data
    const authKeys = ['token', 'accessToken', 'authToken', 'refreshToken', 'userData', 'user'];
    authKeys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    // Re-render buttons
    this.render();

    // Dispatch logout event for other components
    document.dispatchEvent(new CustomEvent('logout'));
  }

  /**
   * Force a re-render of the buttons
   */
  refresh() {
    console.log('🔄 Forcing re-render...');
    this.render();
  }
}

// ============================================
// Initialize the application
// ============================================
(function () {
  // Wait for DOM to be ready
  function initApp() {
    console.log('🚀 Initializing application...');

    // Create the auth button renderer instance
    const authRenderer = new AuthButtonRenderer('authButtons');

    // Expose globally for debugging and other scripts
    window.authRenderer = authRenderer;
    window.auth = {
      isUserLoggedIn: () => authRenderer.isUserLoggedIn(),
      getUserData: () => authRenderer.getUserData(),
      handleLogin: (userData, token) => authRenderer.handleLogin(userData, token),
      handleLogout: () => authRenderer.handleLogout(),
      refresh: () => authRenderer.refresh(),
    };

    // Set up periodic check (every 3 seconds) to catch auth changes
    let lastAuthState = authRenderer.isUserLoggedIn();
    setInterval(() => {
      const currentAuthState = authRenderer.isUserLoggedIn();
      if (currentAuthState !== lastAuthState) {
        console.log('🔄 Auth state changed, re-rendering...');
        lastAuthState = currentAuthState;
        authRenderer.render();
      }
    }, 3000);

    // Listen for storage changes (in case token is updated in another tab)
    window.addEventListener('storage', function (e) {
      const authKeys = ['token', 'accessToken', 'authToken', 'userData', 'user'];
      if (authKeys.includes(e.key)) {
        console.log(`📦 Storage changed for key: ${e.key}`);
        authRenderer.render();
      }
    });

    // Listen for custom login/logout events
    document.addEventListener('login', function (e) {
      console.log('📢 Login event received', e.detail);
      authRenderer.render();
    });

    document.addEventListener('logout', function () {
      console.log('📢 Logout event received');
      authRenderer.render();
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        console.log('👁️ Page became visible, checking auth...');
        authRenderer.render();
      }
    });

    console.log('✅ Application initialized successfully');
    console.log(
      `📊 Current auth state: ${authRenderer.isUserLoggedIn() ? 'Logged in' : 'Logged out'}`,
    );
  }

  // Check if DOM is already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
