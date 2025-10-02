
//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                     REGISTER                   //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
function registerUser() {
    const fullName = document.getElementById("register-fullname").value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();

    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, username, password })
    })
    .then(response => {
        if (!response.ok) throw new Error("Server Error: " + response.status);
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log("Registration successful.");
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';

            const successMsg = document.getElementById('register-success');
            if (successMsg) {
                successMsg.textContent = "Registration successful! You may now log in.";
                successMsg.style.display = 'block';
            }

            setTimeout(() => {
                if (successMsg) {
                    successMsg.style.display = 'none';
                }
                showLogin(); // Go to login page
            }, 2000);
        } else {
            console.warn("Registration failed:", data.message);
        }
    })
    .catch(error => {
        console.error("Registration error:", error);
    });
}




function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('page-register').style.display = 'flex';
}

//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                      LOGIN                     //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
async function login() {
  const username = document.getElementById('username')?.value;
  const password = document.getElementById('password')?.value;

  if (!username || !password) {
    console.log("Username and password must be filled in.");
    return;
  }

  let response;
  try {
    response = await fetch('/api/login', {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
  } catch (networkError) {
    console.error("Network error:", networkError);
    return;
  }

  let result = {};
  try {
    result = await response.json();
  } catch (jsonError) {
    console.error("Failed to parse JSON:", jsonError);
    return;
  }

  if (response.ok && result.status === 'success') {
    console.log("Login successful");

    // ✅ Save token + full name in localStorage
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
    }
    if (result.full_name) {
      localStorage.setItem("full_name", result.full_name);
    }

    // Hide login and register pages
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('page-register').style.display = 'none';

    // Show main page and menu
    document.getElementById('page1').style.display = 'block';
    document.getElementById('menu-bar').style.display = 'flex';

    console.log('Logged in. Redirected to main page.');

    await fetchExpenses();

    const firstName = result.full_name.split(' ')[0];
    document.getElementById('greeting').innerHTML = `Good morning, ${firstName}`;

  } else {
    console.log("Login failed:", result.error || "Invalid credentials");
    const errorEl = document.getElementById('login-error-message');
    if (errorEl) {
      errorEl.innerText = result.error || "Invalid username or password.";
      errorEl.style.display = 'block';
    }
  }
}



function showLogin() {
    showPage('page-login');

    const loginPage = document.getElementById('page-login');
    if (loginPage) {
        loginPage.style.display = 'flex';
        loginPage.style.justifyContent = 'flex-start';
        loginPage.style.alignItems = 'center';
        loginPage.style.height = '100vh';
        loginPage.style.paddingTop = '120px';
    }

    const registerPage = document.getElementById('page-register');
    if (registerPage) {
        registerPage.style.display = 'none';
    }

    const loginMessage = document.getElementById('login-error-message');
    if (loginMessage) {
        loginMessage.style.display = 'none';
    }

    const usernameInput = document.getElementById('username');
    if (usernameInput) {
        usernameInput.focus();
    }
}


async function autoLogin() {
  const token = localStorage.getItem("auth_token");
  if (!token) return; // no stored login

  const response = await fetch("/api/auto-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });

  const data = await response.json();

  if (data.status === "success") {
    showPage("page1");
    document.getElementById("greeting").innerText = `Good morning, ${data.full_name}`;
    await fetchExpenses();
  }
}

// Run autoLogin when app starts
window.addEventListener("load", autoLogin);

//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////               LOGIN FAIL/RETRY                 //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', () => {
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginErrorDiv = document.getElementById('login-error-message');

  if (usernameInput && passwordInput && loginErrorDiv) {
    usernameInput.addEventListener('input', () => {
      loginErrorDiv.style.display = 'none';
    });
    passwordInput.addEventListener('input', () => {
      loginErrorDiv.style.display = 'none';
    });
  }
});



//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                     LOGOUT                     //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
function toggleUserMenu() {
  const menu = document.querySelector('.user-menu');
  if (menu) {
    menu.classList.toggle("show");
  }
}

window.addEventListener("click", function (event) {
  if (!event.target.matches('.fa-user')) {
    const dropdown = document.querySelector(".user-menu");
    if (dropdown) {
      dropdown.classList.remove("show");
    }
  }
});


async function logout() {
  try {
    const response = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include'
    });

    if (response.ok) {
      console.log("Logged out successfully");

      // Clear localStorage so auto-login won't trigger again
      localStorage.removeItem("auth_token");
      localStorage.removeItem("full_name");

      // Reset visibility and layout
      document.getElementById('page1').style.display = 'none';
      document.getElementById('page2').style.display = 'none';
      document.getElementById('page3').style.display = 'none';
      document.getElementById('menu-bar').style.display = 'none';

      const loginPage = document.getElementById('page-login');
      loginPage.style.display = 'flex';
      loginPage.style.justifyContent = 'center';
      loginPage.style.alignItems = 'center';

      const loginError = document.getElementById('login-error-message');
      if (loginError) {
        loginError.style.display = 'none';
        loginError.innerText = '';
      }

    } else {
      console.log("Logout failed:", await response.text());
    }
  } catch (error) {
    console.log("Logout failed:", error);
  }
}



function clearExpensesDisplay() {
  document.getElementById('expenseListDisplay').innerHTML = '';
  document.getElementById('category-bars').innerHTML = '';
  const chartCanvas = document.getElementById('categoryChart');
  if (chartCanvas && chartCanvas.chart) {
    chartCanvas.chart.destroy();
  }
  document.getElementById('consultResponse').querySelector('p').textContent = '';
  expenses_list = [];
}


//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                    EXPENSES                    //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
var expenses_list = [];
let selectedMonth = new Date();
selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);

function updateMonthDisplay() {
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) {
        monthDisplay.innerHTML = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
}


function changeMonth(delta) {
    let year = selectedMonth.getFullYear();
    let month = selectedMonth.getMonth(); 
    let newMonth = new Date(year, month + delta, 1);
    let today = new Date();
    let currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    if (newMonth > currentMonthDate) {
        newMonth = currentMonthDate;
    }
    
    selectedMonth = newMonth;
    updateMonthDisplay();
    displayExpenses();
}

document.addEventListener('DOMContentLoaded', updateMonthDisplay);

function displayExpenses() {
    const tableBody = document.getElementById('expenseListDisplay');
    tableBody.innerHTML = "";
    
    let year = selectedMonth.getFullYear();
    let month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
    let selectedMonthStr = year + "-" + month;
    
    const filteredExpenses = expenses_list.filter(expense => {
        let expenseDate = new Date(expense.datetime);
        let expenseMonth = expenseDate.getFullYear() + "-" + String(expenseDate.getMonth() + 1).padStart(2, '0');
        return expenseMonth === selectedMonthStr;
    });

    if (filteredExpenses.length === 0) {
        const emptyRow = document.createElement('div');
        emptyRow.className = "no-expenses";
        emptyRow.innerHTML = `<p>No expenses yet for ${selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>`;
        tableBody.appendChild(emptyRow);
        return;
    }

    const sortedExpenses = filteredExpenses.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    let lastDate = "";
    
    const categoryIcons = {
        'Food': 'fa-cutlery',
        'Transport': 'fa-bus',
        'Shopping': 'fa-shopping-cart',
        'Entertainment': 'fa-film',
        'Bills': 'fa-bolt',
        'Health': 'fa-heartbeat',
        'Travel': 'fa-plane',
        'Other': 'fa-tag' 
    };

    sortedExpenses.forEach(expense => {
        const expenseDate = new Date(expense.datetime);
        const dayNumber = expenseDate.getDate();
        const dayName = expenseDate.toLocaleDateString('en-US', { weekday: 'long' });
        const monthYear = expenseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });



        const iconClass = categoryIcons[expense.category] || 'fa-tag';

        const row = document.createElement('div');
        row.className = 'expense-item';

        row.innerHTML = `
            <div class="expense-item-icon">
                <i class="fa ${iconClass}" aria-hidden="true"></i>
            </div>
            <div class="expense-item-left">
                <span class="expense-name">${expense.name}</span>
                <div class="expense-category">${expense.category}</div>
            </div>
            <div class="expense-item-middle">
                <div class="expense-amount">&#8364;${parseFloat(expense.amount).toFixed(2)}</div>
                <div class="expense-date">${expenseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>   
            </div>
            <div class="expense-item-right">
                <button class="delete-btn" onclick="deleteExpense(${expense.id})">
                    <i class="fa fa-trash" aria-hidden="true"></i>
                </button>
            </div>
        `;
        tableBody.appendChild(row);
    });
}


// Function to delete an expense from the database
async function deleteExpense(expenseId) {
    try {
        const response = await fetch(`/api/expenses/${expenseId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
    
        if (!result.error) {
            fetchExpenses(); 
        } else {
            console.error('Error deleting expense:', result.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
    
// Function to show notification messages
function showNotification(message, type = 'success') {
    const notificationContainer = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerText = message;
    notificationContainer.appendChild(notification);
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
    
// Send user input to the server to generate and store new expenses, then refresh the list
async function getExpensesFromChatGPT() {
    const userInput = document.getElementById('userInput');
    const userText = userInput.value.trim();
    
    // Remove existing styles
    userInput.classList.remove('success-bg', 'error-bg');
    
    if (!userText) {
        userInput.placeholder = 'Please enter an expense before submitting.';
        userInput.classList.add('error-bg'); 
        setTimeout(() => {
            userInput.classList.add('fade-out'); 
            setTimeout(() => {
                userInput.classList.remove('error-bg', 'fade-out');
            }, 1000); 
        }, 1000); 
        
        return;
        
    }
    
    try {
        console.log('Submitting expense...');  

        const response = await fetch('/api/expenses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput: userText })   
    });

    
        const data = await response.json();
        console.log('Response:', data);
    
        if (data.error) {
            console.error('Error:', data.error);
            userInput.value = '';  
            userInput.placeholder = 'Expense added successfully! \nAdd another one...';
            userInput.classList.add('success-bg');  
            setTimeout(() => {
                userInput.classList.add('fade-out'); 
                setTimeout(() => {
                    userInput.classList.remove('success-bg', 'fade-out');
                }, 1000); 
            }, 1000); 
             
            return;
        }
    
        // If no expenses were detected, show placeholder message
        if (!data.expenses_added || data.expenses_added === 0) {
            userInput.value = '';  
            userInput.placeholder = 'No expenses were detected. Try again!';
            userInput.classList.add('error-bg'); 
            setTimeout(() => {
                userInput.classList.add('fade-out'); // Smooth fade-out effect
                setTimeout(() => {
                    userInput.classList.remove('error-bg', 'fade-out');
                }, 1000);  
            }, 1000);  
            
            return;
        }
    
        // If expense was successfully added
        userInput.value = '';   
        userInput.placeholder = 'Expense added successfully! Add another one...';
        userInput.classList.add('success-bg');   
        setTimeout(() => {
            userInput.classList.add('fade-out'); 
            setTimeout(() => {
                userInput.classList.remove('success-bg', 'fade-out');
            }, 1000); 
        }, 1000); 
        
        // Refresh the expenses list
        setTimeout(fetchExpenses, 1000);
    
    } catch (error) {
        console.error('Error:', error);
        userInput.value = ''; // Clear input
        userInput.placeholder = 'Something went wrong. Please try again.';
        userInput.classList.add('error-bg'); 
        setTimeout(() => {
            userInput.classList.add('fade-out'); 
            setTimeout(() => {
                userInput.classList.remove('error-bg', 'fade-out');
            }, 1000); 
        }, 1000); 
        
    }
}
    
// Fetch the list of expenses from the backend
async function fetchExpenses() {
    try {
        const response = await fetch('/api/expenses', {
           method: 'GET',
           credentials: 'include'
        });
        const data = await response.json();
    
        expenses_list = data.map(expense => ({
            id: expense.id,
            name: expense.name,
            category: expense.category,
            datetime: expense.datetime,
            amount: expense.amount
        }));
    
        updateMonthDisplay();
        displayExpenses();
    } catch (error) {
        console.error('Error fetching expenses:', error);
    }
}

//arrow-btn clicked effect
document.addEventListener('DOMContentLoaded', () => {
  const arrowButtons = document.querySelectorAll('.arrow-btn');
  arrowButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.add('clicked');
      setTimeout(() => btn.classList.remove('clicked'), 200); // remove after 200ms
    });
  });
});

    
//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                     VOICE                      //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
// Speech Recognition API integration
let recognition; 
let isRecording = false; 
    
function startVoiceInput() {
    const voiceButton = document.querySelector('.speak-btn');
    
    if (isRecording) {
        recognition.stop();
        resetVoiceButton();
        return;
    }

    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.start();
        isRecording = true;

        // 🔽 Instead of changing icon, just add the class
        voiceButton.classList.add('recording'); 

        recognition.onresult = event => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('userInput').value = transcript;
            console.log('Voice input:', transcript);
        };

        recognition.onerror = event => {
            console.error('Speech recognition error:', event.error);
            resetVoiceButton();
        };

        recognition.onend = () => {
            resetVoiceButton();
            const userInput = document.getElementById('userInput').value.trim();
            if (userInput) {
                getExpensesFromChatGPT();
            }
        };
    } catch (err) {
        console.error('Speech Recognition API not supported:', err);
        resetVoiceButton();
    }
}

    
// Reset button style when recording stops
function resetVoiceButton() {
    if (recognition) {
        recognition.stop();
    }
    isRecording = false;
    const voiceButton = document.querySelector('.speak-btn');
    voiceButton.classList.remove('recording');
    voiceButton.innerHTML = '<i class="fa fa-microphone"></i> ';
}
    
// Function to stop recording and reset UI
function stopRecording() {
    if (recognition) {
        recognition.stop();
    }
    removeRecordingNotification();
    isRecording = false;
    document.querySelector('.speak-btn').innerHTML = '<i class="fa fa-microphone"></i>';
}
    
// Function to remove the recording notification
function removeRecordingNotification() {
    const notification = document.getElementById('recording-notification');
    if (notification) {
        notification.remove();
    }
}
    



//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                   PIE CHARTS                   //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////    
let selectedStatsMonth = new Date();
selectedStatsMonth = new Date(selectedStatsMonth.getFullYear(), selectedStatsMonth.getMonth(), 1);

function updateStatsMonthDisplay() {
    const statsMonthDisplay = document.getElementById('currentMonthStatsDisplay');
    if (statsMonthDisplay) {
        statsMonthDisplay.innerHTML =  selectedStatsMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
}

function changeStatsMonth(delta) {
    let year = selectedStatsMonth.getFullYear();
    let month = selectedStatsMonth.getMonth();
    let newStatsMonth = new Date(year, month + delta, 1);
    let today = new Date();
    let currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    if (newStatsMonth > currentMonthDate) {
        newStatsMonth = currentMonthDate;
    }
    selectedStatsMonth = newStatsMonth;
    updateStatsMonthDisplay();
    fetchCategoryData();
}

async function fetchCategoryData() {
    try {
        let year = selectedStatsMonth.getFullYear();
        let month = String(selectedStatsMonth.getMonth() + 1).padStart(2, '0');
        const response = await fetch(`/api/categories?year=${year}&month=${month}`);
        const data = await response.json();
        updateCategoryChart(data);
        updateCategoryBars(data, window.categoryChart.data.datasets[0].backgroundColor);
    } catch (error) {
        console.error('Error fetching category data:', error);
    }
}

function updateCategoryChart(data) {
    if (typeof ChartDataLabels !== "undefined") {
        Chart.register(ChartDataLabels);
    } else {
        console.error("ChartDataLabels is not loaded!");
    }
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (window.categoryChart && typeof window.categoryChart.destroy === 'function') {
        window.categoryChart.destroy();
    }
    const labels = data.map(item => item.category);
    const totals = data.map(item => item.total);
    const totalSum = totals.reduce((sum, value) => sum + value, 0);
    if (labels.length === 0) {
        labels.push('No Data');
        totals.push(0);
    }
    const backgroundColors = ['#A1B52D', '#9500F5', '#CFF500', '#7635A0', '#6D753B'];

    // Custom plugin to draw the anchor/callout lines
    const calloutLinesPlugin = {
        id: 'calloutLinesPlugin',
        afterDatasetsDraw(chart, args, options) {
            const { ctx, chartArea } = chart;
            const meta = chart.getDatasetMeta(0);
    
            ctx.save();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#666'; 
    
            meta.data.forEach((arc, index) => {
                if (!arc || arc.hidden) return;
    
                const model = arc.tooltipPosition();
                const dataset = chart.data.datasets[0];
    
                const label = chart.data.labels[index];
                const value = dataset.data[index];
    
                if (value > 0) {
                    // Get midpoint of arc
                    const angle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
                    const midAngleX = arc.x + Math.cos(angle) * (arc.outerRadius + 10);
                    const midAngleY = arc.y + Math.sin(angle) * (arc.outerRadius + 10);
    
                    // Find end label position
                    const labelX = model.x;
                    const labelY = model.y;
    
                    // Draw callout line
                    ctx.beginPath();
                    ctx.moveTo(midAngleX, midAngleY);
                    ctx.lineTo(labelX, labelY);
                    ctx.stroke();
                }
            });
            ctx.restore();
        }
    };
    
    // Create the doughnut chart
    window.categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
              data: totals,
              backgroundColor: backgroundColors,
              borderWidth: 2,
              hoverOffset: 4,
              radius: '95%',   
              cutout: '45%'   
            }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '45%',
          layout: {
            padding: {
              top: 20,
              bottom: 10,
              left: 85,
              right: 85
            }
          },
          plugins: {
            legend: { display: false },
            datalabels: {
              color: '#525252',
              font: { size: 16, weight: 'normal' },
              anchor: 'end',
              align: 'end',
              offset: 12,
              formatter: (value, context) => {
                const totalSum = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = (value / totalSum) * 100;
                return percentage >= 3 ? context.chart.data.labels[context.dataIndex] : '';
              }
            }
          }
        },
        plugins: [calloutLinesPlugin]

    });

    updateCategoryBars(data, backgroundColors);
}


function updateCategoryBars(data, colors) {
    const container = document.getElementById('category-bars');
    container.innerHTML = '';
    const totalSum = data.reduce((sum, item) => sum + item.total, 0);

    if (!data || data.length === 0 || totalSum === 0) {
        container.innerHTML = `<p class="no-expenses">No expenses yet for ${selectedStatsMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>`;
        return;
    }


    // Define icons for each category
    const categoryIcons = {
        'Food': 'fa-cutlery',
        'Transport': 'fa-bus',
        'Shopping': 'fa-shopping-cart',
        'Entertainment': 'fa-film',
        'Bills': 'fa-bolt',
        'Health': 'fa-heartbeat',
        'Travel': 'fa-plane',
        'Other': 'fa-tag' // Default icon
    };

    data.forEach((item, index) => {
        const percentage = Math.round((item.total / totalSum) * 100);
        const iconClass = categoryIcons[item.category] || 'fa-tag'; // Default to 'Other' if not listed
        const categoryBar = `
            <div class="category-bar">
                <div class="icon-label">
                    <span><i class="fa ${iconClass}" aria-hidden="true"></i> ${item.category}</span>
                    <span class="amount">&#8364;${item.total.toFixed(2)}</span>
                </div>
                <div class="progress-row">
                    <div class="progress" style="background-color: #E0E0E0; height: 8px; border-radius: 5px; width: 85%;">
                        <div class="progress-bar" style="height: 100%; border-radius: 5px; background: ${colors[index % colors.length]}; width: ${percentage}%;"></div>
                    </div>
                    <span style="width: 15%; text-align: right;">${percentage}%</span>
                </div>
            </div>
        `;
        container.innerHTML += categoryBar;
    });
}


//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////         WRAP EXPENSES AND GET CONSULTS         //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
function sendConsultQuestion() {
    const question = document.getElementById('consultQuestion').value.trim();
    if (!question) {
        alert("Please enter your question.");
        return;
    }

    fetch('/api/wrap-up', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userInputForConsult: question })
    })
    .then(res => res.json())
    .then(data => {
        const responseBox = document.getElementById('consultResponse');
        if (data.response) {
        responseBox.innerHTML = `<p>${data.response}</p>`;
        } else {
        responseBox.innerHTML = `<p><i>Something went wrong: ${data.error || "Unknown error"}</i></p>`;
        }
    })
    .catch(err => {
        console.error('Request failed:', err);
        document.getElementById('consultResponse').innerHTML = `<p><i>Server error</i></p>`;
    });
}

    
// Global variables to track reading state
let isReading = false;
let currentUtterance = null;
    
function readReport() {
    const button = document.getElementById('readItButton');
    
    // If already reading, stop the speech synthesis
    if (isReading) {
        window.speechSynthesis.cancel();
        isReading = false;
        button.innerHTML = '<i class="fa fa-headphones" aria-hidden="true"></i> Read It';
        return;
    }
    
    const reportText = document.getElementById('wrapExpensesReport').innerText;
    if (reportText.trim() === '') {
        alert("No report available to read.");
        return;
    }
        
    if ('speechSynthesis' in window) {
        currentUtterance = new SpeechSynthesisUtterance(reportText);
        currentUtterance.onend = function() {
            isReading = false;
            button.innerHTML = '<i class="fa fa-headphones" aria-hidden="true"></i> Read It';
        };
        // Update state and button text (with stop icon) then speak
        isReading = true;
        button.innerHTML = '<i class="fa fa-stop" aria-hidden="true"></i>  Stop';
        window.speechSynthesis.speak(currentUtterance);
    } else {
        alert("Sorry, your browser does not support speech synthesis.");
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                 CHAT ASSISTANT (PAGE 3)           ////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

async function sendMessage() {
  const inputEl = document.getElementById("chatInput");
  const message = inputEl.value.trim();
  if (!message) return;

  // Add user message
  addMessage(message, "user-message");
  inputEl.value = "";

  // Typing indicator
  const typingId = addMessage("Assistant is typing...", "assistant-message typing");

  try {
    const response = await fetch('/api/wrap-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userInputForConsult: message })
    });

    const data = await response.json();

    // Remove typing indicator
    removeMessage(typingId);

    if (data.response) {
      addMessage(data.response, "assistant-message");
    } else {
      addMessage("⚠️ " + (data.error || "No response from assistant."), "assistant-message");
    }
  } catch (err) {
    removeMessage(typingId);
    addMessage("❌ Error connecting to assistant.", "assistant-message");
    console.error(err);
  }
}

function addMessage(text, className) {
  const container = document.getElementById("chat-container");
  const msgEl = document.createElement("div");
  msgEl.className = "message " + className;
  msgEl.textContent = text;
  container.appendChild(msgEl);

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;

  return msgEl; // return element for reference (e.g., typing)
}

function removeMessage(msgEl) {
  if (msgEl && msgEl.remove) {
    msgEl.remove();
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("chatInput");

  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto"; // reset
    chatInput.style.height = chatInput.scrollHeight + "px"; // adjust
  });
});


    
//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                      MENU                      //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
function showPage(pageId) {
  const pages = ['page-login', 'page-register', 'page1', 'page2', 'page3'];
  pages.forEach(id => {
    const page = document.getElementById(id);
    if (page) page.style.display = (id === pageId) ? 'block' : 'none';
  });

   if (pageId === 'page2') {
    // Ensure both parts are refreshed
    updateStatsMonthDisplay();
    fetchCategoryData();
  }

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.style.display = 'flex';

    // Restore login page flex centering
    if (pageId === 'page-login') {
      targetPage.style.justifyContent = 'flex-start';
      targetPage.style.alignItems = 'center';
      targetPage.style.height = '100vh';
      targetPage.style.paddingtop = '120px';
    }
  }

  const menuBar = document.getElementById('menu-bar');
  if (pageId === 'page1' || pageId === 'page2' || pageId === 'page3') {
    menuBar.style.display = 'flex';
  } else {
    menuBar.style.display = 'none';
  }


    // Highlight active menu button
  const buttons = document.querySelectorAll('#menu-bar button');
  buttons.forEach(btn => btn.classList.remove('active'));

  if (pageId === 'page1') {
    document.querySelector('#menu-bar button:nth-child(1)')?.classList.add('active');
  } else if (pageId === 'page2') {
    document.querySelector('#menu-bar button:nth-child(2)')?.classList.add('active');
  } else if (pageId === 'page3') {
    document.querySelector('#menu-bar button:nth-child(3)')?.classList.add('active');
  }


}


//////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////                    INSTALL                     //////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then(reg => console.log("Service Worker registered:", reg))
      .catch(err => console.error("Service Worker registration failed:", err));
  });
}


let deferredPrompt;
const installBtn = document.getElementById('install-btn');

// Listen for the event fired by the browser
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-info bar from appearing automatically
  e.preventDefault();
  deferredPrompt = e;
  // Show your custom install button
  installBtn.style.display = 'block';
});

// When user clicks your button
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) {
    return;
  }
  // Show the install prompt
  deferredPrompt.prompt();
  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install: ${outcome}`);
  // Reset
  deferredPrompt = null;
  installBtn.style.display = 'none';
});
