document.addEventListener('DOMContentLoaded', () => {
  const goalForm = document.getElementById('goalForm');
  const goalsListContainer = document.getElementById('goalsList');

  // Fetch and display active goals
  async function loadGoals() {
    if (!goalsListContainer) return;

    try {
      const response = await fetch('/api/goals', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch financial goals.');

      const goals = await response.json();

      if (goals.length === 0) {
        goalsListContainer.innerHTML =
          '<p class="text-muted">No financial goals created yet. Set one above!</p>';
        return;
      }

      goalsListContainer.innerHTML = goals
        .map((goal) => {
          const target = parseFloat(goal.target_amount);
          const current = parseFloat(goal.current_amount);
          const rawPercent = (current / target) * 100;
          const percent = Math.min(rawPercent, 100).toFixed(1);

          return `
          <div class="goal-card" style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #fff;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="margin: 0;">${goal.title}</h4>
              <span style="font-size: 0.85em; color: #666;">Target: ${new Date(goal.target_date).toLocaleDateString()}</span>
            </div>
            
            <div style="margin: 10px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 0.9em; margin-bottom: 4px;">
                <span>Saved: $${current.toFixed(2)} / $${target.toFixed(2)}</span>
                <strong>${percent}%</strong>
              </div>
              
              <div style="width: 100%; height: 10px; background-color: #e9ecef; border-radius: 5px; overflow: hidden;">
                <div style="width: ${percent}%; height: 100%; background-color: ${percent >= 100 ? '#28a745' : '#007bff'}; transition: width 0.4s ease;"></div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <input type="number" id="deposit-${goal.goal_id}" placeholder="Amount ($)" step="0.01" style="width: 120px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px;">
              <button onclick="handleDeposit(${goal.goal_id})" style="background: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
                Add Deposit
              </button>
            </div>
          </div>
        `;
        })
        .join('');
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  }

  // Handle new goal submission
  if (goalForm) {
    goalForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('goalTitle').value.trim();
      const target_amount = parseFloat(document.getElementById('goalTargetAmount').value);
      const target_date = document.getElementById('goalTargetDate').value;

      if (!title || isNaN(target_amount) || target_amount <= 0 || !target_date) {
        alert('Please fill out all goal fields correctly.');
        return;
      }

      try {
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, target_amount, target_date }),
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to create goal.');

        alert('New financial goal set successfully!');
        goalForm.reset();
        loadGoals();
      } catch (error) {
        console.error('Error creating goal:', error);
        alert('Error saving target goal.');
      }
    });
  }

  // Global function for handling deposits from the inline card buttons
  window.handleDeposit = async (goalId) => {
    const inputField = document.getElementById(`deposit-${goalId}`);
    const amount = parseFloat(inputField.value);

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive deposit amount.');
      return;
    }

    try {
      const response = await fetch('/api/goals/deposit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId, amount }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Deposit failed.');

      alert('Deposit added to target goal!');
      loadGoals();
    } catch (error) {
      console.error('Error making deposit:', error);
      alert('Failed to record deposit.');
    }
  };

  loadGoals();
});
