document.addEventListener('DOMContentLoaded', function () {
  function getToken() {
    const token = localStorage.getItem('token');

    if (!token) {
      window.location.href = 'index.html';
      return null;
    }

    return token;
  }

  token = getToken();

  processRecurringTransactions();

  // add recurring form
  const recurringForm = document.getElementById('recurringForm');

  if (recurringForm) {
    recurringForm.addEventListener('submit', createRecurringTransaction);
  }

  // edit recurring form
  const editRecurringForm = document.getElementById('editRecurringForm');

  if (editRecurringForm) {
    editRecurringForm.addEventListener('submit', function (event) {
      event.preventDefault();
      updateRecurringTransaction();
    });
  }

  // apply filters button
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', filterRecurringTransactions);
  }

  // reset filters button
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetFilters);
  }

  // confirm delete button
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', function () {
      deleteRecurring(deleteId);

      const modal = window.bootstrap.Modal.getInstance(
        document.getElementById('deleteConfirmModal'),
      );

      if (modal) {
        modal.hide();
      }
    });
  }
});

let token = null;
let editingId = null;
let deleteId = null;

// ==========================================
// LOAD CATEGORIES FOR ADD MODAL
// ==========================================
function loadCategories() {
  const callback = (status, data) => {
    const select = document.getElementById('category');
    if (!select) return;

    select.innerHTML = '<option value="">Select Category</option>';

    const rows = data?.rows || [];

    rows.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.category_id;
      option.textContent = `${cat.category_name} (${cat.category_type})`;
      select.appendChild(option);
    });
  };

  fetchMethod(currentUrl + '/api/categories', callback, 'GET', null, token);
}

// ==========================================
// LOAD CATEGORIES FOR EDIT MODAL
// ==========================================
function loadCategoriesForEdit() {
  const callback = (status, data) => {
    const select = document.getElementById('editCategory');
    if (!select) return;

    select.innerHTML = '<option value="">Select Category</option>';

    const rows = data?.rows || [];

    rows.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat.category_id;
      option.textContent = `${cat.category_name} (${cat.category_type})`;
      select.appendChild(option);
    });
  };

  fetchMethod(currentUrl + '/api/categories', callback, 'GET', null, token);
}

// ==========================================
// SHOW RECURRING TRANSACTIONS
// ==========================================
function showRecurringTransactions() {
  const callback = (status, data) => {
    const tbody = document.getElementById('recurringTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const rows = data?.rows || [];
    const filterFrequency = document.getElementById('filterFrequency')?.value || 'all';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';

    // Apply filters
    let filteredRows = rows;
    if (filterFrequency !== 'all') {
      filteredRows = filteredRows.filter(
        (r) => r.frequency.toLowerCase() === filterFrequency.toLowerCase(),
      );
    }
    if (filterStatus !== 'all') {
      filteredRows = filteredRows.filter((r) => r.is_active.toString() === filterStatus);
    }

    const noDataElement = document.getElementById('noRecurringData');
    if (noDataElement) {
      noDataElement.style.display = filteredRows.length === 0 ? 'block' : 'none';
    }

    if (filteredRows.length === 0) return;

    let active = filteredRows.filter((r) => r.is_active).length;
    let nextRunDate = null;

    filteredRows.forEach((recurring) => {
      if (!nextRunDate || new Date(recurring.next_date) < new Date(nextRunDate)) {
        nextRunDate = recurring.next_date;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
                <td>${recurring.recurring_id}</td>
                <td>${escapeHtml(recurring.description || '-')}</td>
                <td>${escapeHtml(recurring.category_name)}</td>
                <td>$${parseFloat(recurring.amount).toFixed(2)}</td>
                <td>${recurring.frequency}</td>
                <td>${formatDate(recurring.next_date)}</td>
                <td>${formatDate(recurring.end_date)}</td>
                <td><span class="badge ${recurring.is_active ? 'bg-success' : 'bg-secondary'}">${recurring.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm edit-btn" data-id="${recurring.recurring_id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${recurring.recurring_id}">Delete</button>
                </td>
            `;
      tbody.appendChild(row);
    });

    const totalElement = document.getElementById('totalRecurring');
    const activeElement = document.getElementById('activeRecurring');
    const nextRunElement = document.getElementById('nextRun');

    if (totalElement) totalElement.textContent = filteredRows.length;
    if (activeElement) activeElement.textContent = active;
    if (nextRunElement)
      nextRunElement.textContent = nextRunDate ? formatDate(nextRunDate) : 'No upcoming run';

    setupButtons();
  };

  fetchMethod(`${currentUrl}/api/recurringTransactions`, callback, 'GET', null, token);
}

// ==========================================
// SETUP BUTTONS
// ==========================================
function setupButtons() {
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.onclick = () => openDeleteModal(btn.dataset.id);
  });
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.onclick = () => openEdit(btn.dataset.id);
  });
}

// ==========================================
// CREATE RECURRING TRANSACTION
// ==========================================
function createRecurringTransaction(event) {
  event.preventDefault();

  const data = {
    category_id: document.getElementById('category').value,
    amount: document.getElementById('amount').value,
    description: document.getElementById('description').value,
    frequency: document.getElementById('frequency').value,
    next_date: document.getElementById('startDate').value,
    end_date: document.getElementById('endDate').value || null,
    is_active: document.getElementById('isActive')
      ? document.getElementById('isActive').value === 'true'
      : true,
  };

  if (!data.category_id || !data.amount || !data.frequency || !data.next_date) {
    alert('Please fill all required fields');
    return;
  }

  const callback = (status, res) => {
    if (status === 201) {
      showToast('Recurring transaction created successfully!', 'success');
      const modal = window.bootstrap.Modal.getInstance(
        document.getElementById('addRecurringModal'),
      );
      if (modal) modal.hide();
      document.getElementById('recurringForm')?.reset();
      showRecurringTransactions();
    } else {
      showToast(res.message || 'Failed to create recurring transaction', 'error');
    }
  };

  fetchMethod(currentUrl + '/api/recurringTransactions', callback, 'POST', data, token);
}

// ==========================================
// DELETE RECURRING TRANSACTION
// ==========================================
function deleteRecurring(id) {
  if (!id) {
    showToast('Invalid recurring transaction', 'error');
    return;
  }

  const callback = (status, res) => {
    if (status === 200) {
      showToast('Recurring transaction deleted successfully!', 'success');

      showRecurringTransactions();
    } else {
      showToast(res.message || 'Delete failed', 'error');
    }
  };

  fetchMethod(currentUrl + `/api/recurringTransactions/${id}`, callback, 'DELETE', null, token);
}

// ==========================================
// OPEN EDIT MODAL
// ==========================================
function openEdit(id) {
  editingId = id;

  const callback = (status, data) => {
    if (status === 200 && data) {
      // Populate edit form
      document.getElementById('editCategory').value = data.category_id;
      document.getElementById('editAmount').value = data.amount;
      document.getElementById('editDescription').value = data.description || '';
      document.getElementById('editFrequency').value = data.frequency;
      document.getElementById('editStartDate').value =
        data.next_date || null ? data.next_date.split('T')[0] : '';
      document.getElementById('editEndDate').value = data.end_date
        ? data.end_date.split('T')[0]
        : '';
      document.getElementById('editIsActive').value = data.is_active.toString();

      // Show edit modal
      const editModal = new window.bootstrap.Modal(document.getElementById('editRecurringModal'));
      editModal.show();
    } else {
      showToast('Could not fetch transaction data for editing', 'error');
      return;
    }
  };

  fetchMethod(currentUrl + `/api/recurringTransactions/${id}`, callback, 'GET', null, token);
}

// ==========================================
// UPDATE RECURRING TRANSACTION
// ==========================================
function updateRecurringTransaction() {
  // Make sure we have an editing ID
  if (!editingId) {
    console.error('No editing ID set');
    alert('Error: No transaction selected for editing');
    return;
  }

  const data = {
    category_id: document.getElementById('editCategory').value,
    amount: document.getElementById('editAmount').value,
    description: document.getElementById('editDescription').value,
    frequency: document.getElementById('editFrequency').value,
    next_date: document.getElementById('editStartDate').value,
    end_date: document.getElementById('editEndDate').value,
    is_active: document.getElementById('editIsActive').value === 'true',
  };

  if (!data.category_id || !data.amount || !data.frequency || !data.next_date) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  const callback = (status, res) => {
    if (status === 200) {
      showToast('Recurring transaction updated successfully!', 'success');

      // Close the modal
      const modalElement = window.document.getElementById('editRecurringModal');
      const modal = window.bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }

      // Reset editing ID
      editingId = null;

      // Refresh the table
      showRecurringTransactions();
    } else {
      showToast(res.message || 'Update failed', 'error');
      console.error('Update error:', res);
    }
  };

  fetchMethod(currentUrl + `/api/recurringTransactions/${editingId}`, callback, 'PUT', data, token);
}

// ==========================================
// FILTER RECURRING TRANSACTIONS
// ==========================================
function filterRecurringTransactions() {
  showRecurringTransactions();
}

// ==========================================
// RESET FILTERS
// ==========================================
function resetFilters() {
  const frequencyFilter = document.getElementById('filterFrequency');
  const statusFilter = document.getElementById('filterStatus');

  if (frequencyFilter) frequencyFilter.value = 'all';
  if (statusFilter) statusFilter.value = 'all';

  showRecurringTransactions();
}

// ==========================================
// UTILITY: FORMAT DATE
// ==========================================
function formatDate(dateString) {
  if (!dateString) return '-';
  // try {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  // } catch (e) {
  //   return dateString;
  // }
}

// ==========================================
// UTILITY: ESCAPE HTML
// ==========================================
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function processRecurringTransactions() {
  const callback = (status, data) => {
    if (status >= 400) {
      console.error(data);
      return;
    }

    if (status === 200) {
      showRecurringTransactions();
      loadCategories();
      loadCategoriesForEdit();
    }
  };

  fetchMethod(currentUrl + '/api/recurringTransactions/process', callback, 'POST', null, token);
}

// ==========================================
// SHOW POPUP MESSAGE
// ==========================================
function showToast(message, type = 'success') {
  const toastElement = document.getElementById('alertToast');
  const toastMessage = document.getElementById('alertMessage');

  if (!toastElement || !toastMessage) return;

  toastMessage.textContent = message;

  toastElement.className =
    type === 'success'
      ? 'toast align-items-center text-bg-success border-0'
      : 'toast align-items-center text-bg-danger border-0';

  const toast = new window.bootstrap.Toast(toastElement, {
    delay: 3000,
  });

  toast.show();
}

// ==========================================
// DELETE CONFIRMATION MODAL
// ==========================================

function openDeleteModal(id) {
  deleteId = id;

  const modal = new window.bootstrap.Modal(document.getElementById('deleteConfirmModal'));

  modal.show();
}
