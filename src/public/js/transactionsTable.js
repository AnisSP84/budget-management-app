const apiUrl = `${currentUrl}/api/transactions`;

let currentBudgetLimit = 0.0;
let editingId = null;

function getDeletedHistoryKey() {
  const token = localStorage.getItem('token');
  if (!token) return 'recentlyDeletedHistory_guest';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return `recentlyDeletedHistory_user_${payload.userId || payload.id || 'default'}`;
  } catch {
    return 'recentlyDeletedHistory_guest';
  }
}

async function fetchBudget() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiUrl}/budget`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      currentBudgetLimit = parseFloat(data.budget_limit || 0);

      const budgetDisplay = document.getElementById('totalLimitDisplay');
      if (budgetDisplay) {
        budgetDisplay.textContent = window.convertCurrencyWithSymbol(currentBudgetLimit);
      }
    }
  } catch (err) {
    console.error('Failed to load budget:', err);
  }
}

async function handleBudgetUpdate() {
  const budgetInput = document.getElementById('budgetInput');
  const newAmount = parseFloat(budgetInput.value);

  if (isNaN(newAmount) || newAmount < 0) {
    alert('Please enter a valid budget amount.');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${apiUrl}/budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: newAmount }),
    });

    if (response.ok) {
      currentBudgetLimit = newAmount;
      const budgetDisplay = document.getElementById('totalLimitDisplay');
      if (budgetDisplay) budgetDisplay.textContent = window.convertCurrencyWithSymbol(newAmount);

      budgetInput.value = '';
      fetchTransactions();
    }
  } catch (err) {
    console.error('Error updating budget:', err);
  }
}

async function fetchTransactions() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server Error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const tableBody = document.getElementById('transactionTableBody');
    const template = document.getElementById('transactionRowTemplate');

    if (!tableBody || !template) return;

    tableBody.innerHTML = '';
    let totalSpent = 0;
    const transactions = Array.isArray(data) ? data : data.rows || [];

    if (transactions.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center">No transactions found. Add your first expense above!</td></tr>`;
      updateBudgetSummary(0);
      updateSelectionState();
      return;
    }

    transactions.forEach((t) => {
      const row = document.importNode(template.content, true);
      const dateValue = t.transaction_date
        ? new Date(t.transaction_date).toLocaleDateString()
        : 'N/A';
      const amount = parseFloat(t.amount || 0);

      const checkbox = row.querySelector('.transaction-checkbox');
      if (checkbox) {
        checkbox.value = t.transaction_id;
      }

      row.querySelector('.t-date').textContent = dateValue;
      row.querySelector('.t-name').textContent = t.description || 'No Description';
      row.querySelector('.t-category').textContent = t.category_name || 'Uncategorized';
      row.querySelector('.t-amount').textContent = window.convertCurrencyWithSymbol(amount);

      const deleteBtn = row.querySelector('.delete-btn');
      deleteBtn.onclick = () => deleteTransaction(t.transaction_id);

      const editBtn = row.querySelector('.edit-btn');
      if (editBtn) {
        editBtn.onclick = () => prepareEdit(t);
      }

      tableBody.appendChild(row);
      totalSpent += amount;
    });

    updateBudgetSummary(totalSpent);
    updateSelectionState();
  } catch (err) {
    console.error('Failed to load transactions:', err);
  }
}

function toggleSelectAll(selectAllEl) {
  const checkboxes = document.querySelectorAll('.transaction-checkbox');
  checkboxes.forEach((cb) => {
    const row = cb.closest('tr');
    if (row && row.style.display !== 'none') {
      cb.checked = selectAllEl.checked;
    }
  });
  updateSelectionState();
}

function updateSelectionState() {
  const selectedCheckboxes = document.querySelectorAll('.transaction-checkbox:checked');
  const allVisibleCheckboxes = Array.from(
    document.querySelectorAll('.transaction-checkbox'),
  ).filter((cb) => {
    const row = cb.closest('tr');
    return row && row.style.display !== 'none';
  });

  const deleteBtn = document.getElementById('deleteSelectedBtn');
  const selectedCountEl = document.getElementById('selectedCount');
  const selectAllCb = document.getElementById('selectAllCheckbox');

  const count = selectedCheckboxes.length;

  if (selectedCountEl) selectedCountEl.textContent = count;
  if (deleteBtn) deleteBtn.disabled = count === 0;

  if (selectAllCb) {
    selectAllCb.checked = allVisibleCheckboxes.length > 0 && count === allVisibleCheckboxes.length;
  }
}

function saveToDeletedHistory(item) {
  const storageKey = getDeletedHistoryKey();
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const record = {
    description: item.description || 'No Description',
    category_name: item.category_name || 'Uncategorized',
    amount: item.amount || 0,
    deleted_at: new Date().toISOString(),
  };
  existing.unshift(record);
  localStorage.setItem(storageKey, JSON.stringify(existing.slice(0, 20)));
}

async function handleBulkDelete() {
  const selectedCheckboxes = document.querySelectorAll('.transaction-checkbox:checked');
  const idsToDelete = Array.from(selectedCheckboxes).map((cb) => parseInt(cb.value, 10));

  if (idsToDelete.length === 0) return;

  if (!confirm(`Are you sure you want to delete ${idsToDelete.length} selected transaction(s)?`)) {
    return;
  }

  selectedCheckboxes.forEach((cb) => {
    const row = cb.closest('tr');
    if (row) {
      const description = row.querySelector('.t-name')?.textContent;
      const category_name = row.querySelector('.t-category')?.textContent;
      const amountText = row.querySelector('.t-amount')?.textContent;
      const amount = amountText ? parseFloat(amountText.replace(/[^0-9.]/g, '')) : 0;
      saveToDeletedHistory({ description, category_name, amount });
    }
  });

  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${apiUrl}/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: idsToDelete }),
    });

    if (response.ok) {
      const selectAllCb = document.getElementById('selectAllCheckbox');
      if (selectAllCb) selectAllCb.checked = false;
      fetchTransactions();
      loadRecentlyDeleted();
    } else {
      const errorData = await response.json();
      alert('Bulk Delete Failed: ' + (errorData.message || 'Error'));
    }
  } catch (err) {
    console.error('Error during bulk delete:', err);
    alert('An unexpected error occurred while deleting transactions.');
  }
}

function prepareEdit(transaction) {
  editingId = transaction.transaction_id;

  document.getElementById('transName').value = transaction.description;
  document.getElementById('transAmount').value = transaction.amount;
  document.getElementById('transCategory').value = transaction.category_id;

  if (transaction.transaction_date) {
    const date = new Date(transaction.transaction_date);
    document.getElementById('transDate').value = date.toISOString().split('T')[0];
  }

  const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
  submitBtn.textContent = 'Update Transaction';
  submitBtn.classList.replace('btn-primary', 'btn-warning');

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'inline-block';
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const token = localStorage.getItem('token');

  const data = {
    category_id: document.getElementById('transCategory').value,
    description: document.getElementById('transName').value,
    amount: document.getElementById('transAmount').value,
    transaction_date: document.getElementById('transDate').value,
  };

  try {
    let response;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    if (editingId) {
      response = await fetch(`${apiUrl}/${editingId}`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(data),
      });
    } else {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
      });
    }

    if (response.ok) {
      resetForm();
      fetchTransactions();
    } else {
      const errorData = await response.json();
      alert('Action Failed: ' + (errorData.message || 'Error'));
    }
  } catch (err) {
    console.error('Submit error:', err);
  }
}

async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;
  const token = localStorage.getItem('token');

  const row = document.querySelector(`input[value="${id}"]`)?.closest('tr');
  if (row) {
    const description = row.querySelector('.t-name')?.textContent;
    const category_name = row.querySelector('.t-category')?.textContent;
    const amountText = row.querySelector('.t-amount')?.textContent;
    const amount = amountText ? parseFloat(amountText.replace(/[^0-9.]/g, '')) : 0;
    saveToDeletedHistory({ description, category_name, amount });
  }

  try {
    const response = await fetch(`${apiUrl}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      fetchTransactions();
      loadRecentlyDeleted();
    }
  } catch (err) {
    console.error('Error deleting:', err);
  }
}

function resetForm() {
  editingId = null;
  document.getElementById('transactionForm').reset();
  const submitBtn = document.querySelector('#transactionForm button[type="submit"]');
  submitBtn.textContent = 'Add';
  submitBtn.classList.remove('btn-warning');
  submitBtn.classList.add('btn-primary');

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
}

function updateBudgetSummary(totalSpent) {
  const remaining = currentBudgetLimit - totalSpent;
  const percentUsed = currentBudgetLimit > 0 ? (totalSpent / currentBudgetLimit) * 100 : 0;

  const progressBar = document.getElementById('budgetProgressBar');
  if (progressBar) {
    progressBar.style.width = `${Math.min(percentUsed, 100)}%`;
    progressBar.className = percentUsed > 90 ? 'progress-bar bg-danger' : 'progress-bar bg-success';
  }

  const display = document.getElementById('remainingBudget');
  if (display) {
    display.textContent = window.convertCurrencyWithSymbol(remaining);
    display.style.color = remaining < 0 ? '#ff5252' : '#2ecc71';
  }

  const badge = document.getElementById('budgetStatusBadge');
  if (badge) {
    if (currentBudgetLimit === 0) {
      badge.textContent = 'Set a Budget';
      badge.className = 'badge rounded-pill bg-secondary';
    } else if (percentUsed <= 50) {
      badge.textContent = 'Looking Good!';
      badge.className = 'badge rounded-pill bg-success';
    } else if (percentUsed <= 80) {
      badge.textContent = 'Watching it...';
      badge.className = 'badge rounded-pill bg-warning text-dark';
    } else if (percentUsed < 100) {
      badge.textContent = 'Almost Out!';
      badge.className = 'badge rounded-pill bg-info text-dark';
    } else {
      badge.textContent = 'Over Budget!';
      badge.className = 'badge rounded-pill bg-danger';
    }
  }
}

function toggleRecentlyDeletedSection() {
  const container = document.getElementById('recentlyDeletedContainer');
  if (container) {
    container.classList.toggle('d-none');
  }
}

function loadRecentlyDeleted() {
  const container = document.getElementById('recentlyDeletedContainer');
  const tableBody = document.getElementById('recentlyDeletedTableBody');

  if (container) {
    container.classList.remove('d-none');
  }

  if (!tableBody) return;

  const storageKey = getDeletedHistoryKey();
  const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
  tableBody.innerHTML = '';

  if (history.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">No recently deleted transactions found.</td>
      </tr>`;
    return;
  }

  history.forEach((item) => {
    const deletedDate = item.deleted_at ? new Date(item.deleted_at).toLocaleString() : 'Recently';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.description}</td>
      <td>${item.category_name}</td>
      <td>${window.convertCurrencyWithSymbol(parseFloat(item.amount || 0))}</td>
      <td><small class="text-muted">${deletedDate}</small></td>
    `;
    tableBody.appendChild(row);
  });
}

window.toggleSelectAll = toggleSelectAll;
window.handleBulkDelete = handleBulkDelete;
window.toggleRecentlyDeletedSection = toggleRecentlyDeletedSection;
window.loadRecentlyDeleted = loadRecentlyDeleted;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.getCurrentCountry) {
    await window.getCurrentCountry();
  }

  const form = document.getElementById('transactionForm');
  if (form) form.addEventListener('submit', handleFormSubmit);

  const saveBudgetBtn = document.getElementById('saveBudgetBtn');
  if (saveBudgetBtn) saveBudgetBtn.addEventListener('click', handleBudgetUpdate);

  const searchInput = document.getElementById('tableSearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', function () {
      const query = this.value.toLowerCase();
      const rows = document.querySelectorAll('#transactionTableBody tr');

      rows.forEach((row) => {
        const nameCell = row.querySelector('.t-name');
        if (nameCell) {
          const description = nameCell.textContent.toLowerCase();
          row.style.display = description.includes(query) ? '' : 'none';
        }
      });
      updateSelectionState();
    });
  }
  await fetchBudget();
  fetchTransactions();
});
