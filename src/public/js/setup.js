const submitCountryBtn = document.getElementById('submitCountryBtn');

// Populate the country dropdown
const setupCountry = () => {
  const select = document.getElementById('countrySelect');

  const callback = (responseStatus, responseData) => {
    if (responseStatus !== 200) return;

    responseData.result.forEach((country) => {
      const option = document.createElement('option');
      option.value = country.code;
      option.textContent = country.name;
      select.appendChild(option);
    });
  };

  fetchMethod(currentUrl + '/api/settings/countries', callback, 'GET');
};

// Enable/disable the warning threshold input
const setupBudgetNotificationToggle = () => {
  const budgetNotification = document.getElementById('budgetNotification');
  const warningThreshold = document.getElementById('warningThreshold');

  const toggleWarningThreshold = () => {
    warningThreshold.disabled = !budgetNotification.checked;
  };

  // Set initial state
  toggleWarningThreshold();

  // Update when toggled
  budgetNotification.addEventListener('change', toggleWarningThreshold);
};

// Handle country selection
const changeCountrySelect = () => {
  const countrySelect = document.getElementById('countrySelect');

  countrySelect.addEventListener('change', () => {
    countrySelect.classList.remove('text-muted');

    if (countrySelect.value !== '') {
      submitCountryBtn.classList.remove('disabled');
    } else {
      submitCountryBtn.classList.add('disabled');
    }
  });
};

// Submit setup
const finishSetup = () => {
  submitCountryBtn.addEventListener('click', (event) => {
    event.preventDefault();

    if (submitCountryBtn.classList.contains('disabled')) return;

    const country = document.getElementById('countrySelect').value;
    const darkMode = document.getElementById('darkMode').checked;
    const budgetNotification = document.getElementById('budgetNotification').checked;
    const warningThreshold = Number(document.getElementById('warningThreshold').value);

    if (
      budgetNotification &&
      (warningThreshold < 1 || warningThreshold > 100 || Number.isNaN(warningThreshold))
    ) {
      alert('Warning threshold must be between 1 and 100.');
      return;
    }

    const token = localStorage.getItem('token');

    const data = {
      country: country,
      dark_mode: darkMode,
      budget_notification: budgetNotification,
      warning_threshold: warningThreshold,
    };

    const callback = (responseStatus, responseData) => {
      if (responseStatus === 201) {
        window.location.href = 'index.html';
      } else {
        console.error(responseData);
      }
    };

    fetchMethod(currentUrl + '/api/settings/initSettings', callback, 'POST', data, token);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  setupCountry();
  changeCountrySelect();
  setupBudgetNotificationToggle();
  finishSetup();
});
