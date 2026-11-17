/*global Chart, getToken*/

//Run when page loads
document.addEventListener('DOMContentLoaded', init);

//Global variables
const token = getToken();

let currentPeriod = 'monthly';
let currentChartType = 'pie';
let reportChart = null;

let reportBody;
let noDataMessage;

//Initialize Page
function init() {
  // if (!token) {
  //   alert('please login first.');
  //   window.location.href = 'login.html';
  //   return;
  // }

  reportBody = document.getElementById('reportBody');
  noDataMessage = document.getElementById('noDataMessage');

  document.getElementById('downloadBtn').addEventListener('click', downloadCSV);

  document.getElementById('chartType').addEventListener('change', function () {
    changeChart(this.value);
  });

  generateReport(currentPeriod);
}

//Generate Summary Report
function generateReport(period) {
  currentPeriod = period;

  loadSummaryReport(period);
  loadCategoryBreakdown(period);
  loadDashboardCards(period);
}

//Load Summary Report
function loadSummaryReport(period) {
  const callback = (status, data) => {
    if (status >= 400) {
      showTableError(data.message);
      return;
    }

    updateSummaryTable(data.report);
  };

  fetchMethod(`${currentUrl}/api/report/summary?period=${period}`, callback, 'GET', null, token);
}

//update summary table
function updateSummaryTable(report) {
  reportBody.innerHTML = '';

  if (!report || report.length === 0) {
    noDataMessage.style.display = 'block';

    reportBody.innerHTML = `
      <tr>
        <td colspan="2">
          No data available
        </td>
      </tr>
    `;

    return;
  }

  noDataMessage.style.display = 'none';

  reportBody.innerHTML = report
    .map(
      (item) => `
    <tr>
      <td>${item.period}</td>
      <td>${formatMoney(item.total)}</td>
    </tr>
    `,
    )
    .join('');
}

//Load Category Breakdown
function loadCategoryBreakdown(period) {
  const callback = (status, data) => {
    if (status >= 400 || !data.report.length) {
      destroyChart();
      return;
    }

    updateTopCategories(data.report);
    drawChart(data.report);
  };

  fetchMethod(`${currentUrl}/api/report/category?period=${period}`, callback, 'GET', null, token);
}

//Draw Report Chart
function drawChart(report) {
  const labels = report.map((item) => item.category_name);
  const values = report.map((item) => Number(item.total));

  destroyChart();

  const ctx = document.getElementById('reportChart');

  reportChart = new Chart(ctx, {
    type: currentChartType,
    data: {
      labels,
      datasets: [
        {
          label: 'Transaction Amount',
          data: values,
          backgroundColor: generateChartColors(labels.length),
        },
      ],
    },
  });
}

//Load Dashboard Cards
function loadDashboardCards(period) {
  const callback = (status, data) => {
    if (status >= 400) {
      return;
    }

    updateCard('totalSpending', data.total_spending);
    updateCard('totalIncome', data.total_income);
    updateCard('netBalance', data.total_income - data.total_spending);
  };

  fetchMethod(
    `${currentUrl}/api/report/dashboard-summary?period=${period}`,
    callback,
    'GET',
    null,
    token,
  );
}

//Update Top 3 Categories
function updateTopCategories(report) {
  console.log(report);
  const topThree = report
    .filter((item) => item.category_type === 'Expenses')
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  document.getElementById('topCategories').innerHTML = topThree
    .map((item) => `<li>${item.category_name} (${formatMoney(item.total)})</li>`)
    .join('');
}

function downloadCSV() {
  fetch(`${currentUrl}/api/report/export/csv?period=${currentPeriod}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${currentPeriod}.csv`;
      a.click();
    });
}

//Change Chart Type
function changeChart(type) {
  currentChartType = type;

  loadCategoryBreakdown(currentPeriod);
}

//Destroy Current Chart
function destroyChart() {
  if (reportChart) {
    reportChart.destroy();
    reportChart = null;
  }
}

//Format Currency
function formatMoney(value) {
  return `$${Number(value).toFixed(2)}`;
}

//Generate Chart Colors
function generateChartColors(count) {
  return Array.from({ length: count }, (_, i) => `hsl(${i * 45}, 70%, 60%)`);
}

//Show Table Error
function showTableError(message) {
  reportBody.innerHTML = `
    <tr>
      <td colspan="2">
        ${message}
      </td>
    </tr>
  `;
}

function updateCard(id, value) {
  document.getElementById(id).textContent = formatMoney(value);
}
