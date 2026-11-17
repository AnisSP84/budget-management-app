document.addEventListener('DOMContentLoaded', function () {
  // get token
  let token = localStorage.getItem('token');

  // function for filling basic budget details
  const callbackBudget = (responseStatus, responseData) => {
    console.log('responseStatus:', responseStatus);
    console.log('responseData:', responseData);
    console.log('Getting user budget');

    const stats = document.getElementById('userStats');
    if (!stats) {
      console.error('Error: #userStats element not found in DOM yet.');
      return;
    }

    if (responseStatus == 200) {
      stats.innerHTML += `
                <div class="container">
                    <div class="row">
                        <div class="col-4">
                            <h5>Budget Limit</h5>
                            <p>${responseData.budget_limit}</p>
                        </div>
                        <div class="col-4">
                            <h5>Amount Spent</h5>
                            <p>${responseData.total_spent}</p>
                        </div>
                        <div class="col-4">
                            <h5>Percentage Spent</h5>
                            <p>${((responseData.total_spent / responseData.budget_limit) * 100).toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
            `;
      return;
    } else {
      console.log('Error retrieving budget');
      stats.innerHTML += `
                <h3>No Budget Found</h3>
                <p>
                    Set up a <a id="budgetButton" href="budget.html" class="btn btn-dark">budget</a> now.
                </p>
            `;
      return;
    }
  };

  // function for filling transaction data
  //   const callbackTransactions = (responseStatus, responseData) => {
  //     console.log('responseStatus:', responseStatus);
  //     console.log('responseData:', responseData);
  //     console.log('Getting transaction details');
  //     const transactionTable = document.getElementById('transactionTableBody');
  //   }

  // function for filling user details
  const callbackUser = (responseStatus, responseData) => {
    console.log('responseStatus:', responseStatus);
    console.log('responseData:', responseData);
    console.log('Getting user details');

    const profile = document.getElementById('profile');

    if (responseStatus == 200) {
      profile.innerHTML += `
                <div class="card col-xl-7 col-lg-8 col-md-9 col-sm-9 col-xs-12 p-4 mx-auto">
                    <div class="card-body">
                        <h5 class="topHead"><strong>${responseData.username}</strong></h5>
                        <div class="card-text">
                            <div id="userStats"></div>
                        </div>
                    </div>
                </div>
                <div class="accordion">
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="true" aria-controls="collapseTwo">
                                E-Mail
                            </button>
                        </h2>
                        <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                            <div class="accordion-body">
                                E-Mail: <strong>${responseData.email}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour" aria-expanded="true" aria-controls="collapseFour">
                                Date of Birth
                            </button>
                        </h2>
                        <div id="collapseFour" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                            <div class="accordion-body">
                                Date of Birth: <strong>${responseData.dob}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFive" aria-expanded="true" aria-controls="collapseFive">
                                Occupation
                            </button>
                        </h2>
                        <div id="collapseFive" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                            <div class="accordion-body">
                                Occupation: <strong>${responseData.occupation}</strong>
                            </div>
                        </div>
                    </div>
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseSix" aria-expanded="true" aria-controls="collapseSix">
                                Account Creation
                            </button>
                        </h2>
                        <div id="collapseSix" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                            <div class="accordion-body">
                                Account Created At: <strong>${responseData.created_at.slice(0, 10)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <br>
                <div class="d-flex justify-content-center pt-4">
                    <a class="btn btn-primary" href="settings.html" role="button">Edit Profile</a>
                </div>
            `;

      // fetch the budget AFTER the user profile DOM elements are generated
      fetchMethod(currentUrl + `/api/budget/`, callbackBudget, 'GET', null, token);
      //   fetchMethod(currentUrl + `/api/transactions/`, callbackTransactions, 'GET', null, token);
      return;
    } else {
      console.log('Error retrieving User');
      profile.innerHTML += `
                <div class="card col-xl-6 col-lg-7 col-md-8 col-sm-8 col-xs-12 p-3 mx-auto">
                    <div class="card-body">
                        <h5 class="topHead">Not Logged In</h5>
                        <p class="card-text">
                            Log in to view your profile. <br>
                        </p>
                        <a id="loginButton" href="login.html" class="btn btn-dark">Login</a>
                    </div>
                </div>
            `;
      return;
    }
  };

  fetchMethod(currentUrl + `/api/users/`, callbackUser, 'GET', null, token);
});
