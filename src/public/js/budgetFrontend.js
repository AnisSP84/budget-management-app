const apiUrl = `${currentUrl}/api/budget`;

document.addEventListener('DOMContentLoaded', async () => {
  const budgetForm = document.getElementById('budgetForm');
  const budgetAmountInput = document.getElementById('budgetAmount');
  const displayLimit = document.getElementById('displayLimit');
  const displaySpent = document.getElementById('displaySpent');
  const budgetProgressBar = document.getElementById('budgetProgressBar');
  const budgetStatusBadge = document.getElementById('budgetStatusBadge');
  const categoryListContainer = document.getElementById('categoryBreakdownList');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  function updateDashboardUI(limit, spent) {
    if (displayLimit) displayLimit.textContent = window.convertCurrencyWithSymbol(limit);
    if (displaySpent) displaySpent.textContent = window.convertCurrencyWithSymbol(spent);

    const percentUsed = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;

    if (budgetProgressBar) {
      budgetProgressBar.style.width = `${percentUsed}%`;
    }

    if (budgetStatusBadge) {
      if (percentUsed >= 90) {
        if (budgetProgressBar) budgetProgressBar.style.backgroundColor = '#dc3545';
        budgetStatusBadge.textContent = 'Warning: Over-allocated or near limit!';
        budgetStatusBadge.className = 'status-badge';
        budgetStatusBadge.style.backgroundColor = '#f8d7da';
        budgetStatusBadge.style.color = '#721c24';
      } else if (percentUsed >= 75) {
        if (budgetProgressBar) budgetProgressBar.style.backgroundColor = '#ffc107';
        budgetStatusBadge.textContent = 'Approaching your spending boundary.';
        budgetStatusBadge.className = 'status-badge';
        budgetStatusBadge.style.backgroundColor = '#fff3cd';
        budgetStatusBadge.style.color = '#856404';
      } else {
        if (budgetProgressBar) budgetProgressBar.style.backgroundColor = '#28a745';
        budgetStatusBadge.textContent = 'Looking Good! Financial standing stable.';
        budgetStatusBadge.className = 'status-badge';
        budgetStatusBadge.style.backgroundColor = '#d4edda';
        budgetStatusBadge.style.color = '#155724';
      }
    }
  }

  async function checkAndSendNotification(limit, spent) {
    if (limit <= 0) return;
    const percentUsed = (spent / limit) * 100;

    let payload = null;
    if (percentUsed >= 100) {
      payload = {
        title: 'Budget Exceeded',
        message: `You have spent ${window.convertCurrencyWithSymbol(spent)}, exceeding your limit of ${window.convertCurrencyWithSymbol(limit)}.`,
        type: 'EXCEEDED',
      };
    } else if (percentUsed >= 90) {
      payload = {
        title: 'Budget Warning',
        message: `You have used ${percentUsed.toFixed(1)}% of your monthly budget.`,
        type: 'WARNING',
      };
    }

    if (payload) {
      try {
        await fetch(`${apiUrl}/notifications`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('Failed to log notification:', err);
      }
    }
  }

  async function loadCategoryAnalytics() {
    if (!categoryListContainer) return;
    try {
      const response = await fetch(`${apiUrl}/analytics`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return;

      const categories = await response.json();
      if (!Array.isArray(categories) || categories.length === 0) {
        categoryListContainer.innerHTML = '<p>No expenses recorded this month.</p>';
        return;
      }

      categoryListContainer.innerHTML = categories
        .map(
          (cat) => `
        <div class="category-item" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee;">
          <span>${cat.category_name}</span>
          <strong>${window.convertCurrencyWithSymbol(parseFloat(cat.total_amount))}</strong>
        </div>
      `,
        )
        .join('');
    } catch (error) {
      console.error('Error loading category analytics:', error);
    }
  }

  async function loadBudgetData() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        if (budgetStatusBadge) budgetStatusBadge.textContent = 'Please log in to view your budget.';
        return;
      }

      const response = await fetch(`${apiUrl}/summary`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error(`HTTP Error (${response.status})`);

      const data = await response.json();
      const limitValue = parseFloat(data.budget_limit || data.amount) || 0.0;
      const spentValue = parseFloat(data.total_spent) || 0.0;

      if (budgetAmountInput) budgetAmountInput.value = limitValue > 0 ? limitValue : '';
      updateDashboardUI(limitValue, spentValue);
      checkAndSendNotification(limitValue, spentValue);
      loadCategoryAnalytics();
    } catch (error) {
      console.error('Error loading budget details:', error);
      if (budgetStatusBadge) {
        budgetStatusBadge.textContent = 'Please log in to view your budget.';
      }
    }
  }

  if (budgetForm) {
    budgetForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const targetAmount = parseFloat(budgetAmountInput.value);
      if (isNaN(targetAmount) || targetAmount < 0) {
        alert('Please enter a valid, non-negative budget allocation value.');
        return;
      }

      try {
        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ amount: targetAmount }),
        });

        const resData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(resData.message || 'Data storage update verification rejected.');
        }

        alert('Budget constraints adjusted successfully.');
        loadBudgetData();
      } catch (error) {
        console.error('Error modifying budget parameters:', error);
        alert(`Failed to update budget: ${error.message}`);
      }
    });
  }

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in to export your financial summary.');
          return;
        }

        const response = await fetch(`${currentUrl}/api/export/csv`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to generate export file.');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `financial_summary_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        console.error('Export Error:', err);
        alert('Unable to download summary report.');
      }
    });
  }

  await loadBudgetData();
});
