const navbarHTML = `
      <nav class="navbar navbar-expand-lg navbar-dark bg-primary w-100">
        <div class="container">
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse p-lg-0 p-4 bg-primary" id="navbarNav">
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
            <li class="nav-item"><a class="nav-link" href="transactionsTable.html">Transactions</a></li>
            <li class="nav-item"><a class="nav-link" href="report.html">Report</a></li>
            <li class="nav-item"><a class="nav-link" href="settings.html">Settings</a></li>
            <li class="nav-item"><a class="nav-link" href="notifications.html">Notifications</a></li>
            <li class="nav-item"><a class="nav-link" href="profile.html">Profile</a></li>
          </ul>
          
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a id="logoutButton" href="#" class="nav-link">Logout</a>
            </li>
            <li class="nav-item">
              <a id="loginButton" href="login.html" class="nav-link">Login</a>
            </li>
            <li>
              <div class="btn-nav">
                <a id="registerButton" class="btn text-bg-dark btn-small navbar-btn" href="register.html">Register!</a>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </nav>
`;

document.body.insertAdjacentHTML('afterbegin', navbarHTML);
