/*LOGIN*/
function login() {
    window.location.href = "Home.html";
}

function signup() {
    window.location.href = "NewAccount.html";
}

/*NEW*/
function goToLogin() {
    window.location.href = "Login.html";
}

function createAccount() {
    window.location.href = "Login.html";
}

/*HOME*/
function toQuest() {
    window.location.href = "Quest.html";
}

function toLeaderboard() {
    window.location.href = "Leaderboard.html";
}

function toProfile() {
    window.location.href = "Profile.html";
}

/*LEADERBOARD*/
function toHome() {
    window.location.href = "Home.html"
}

(function () {
        const timeEl = document.getElementById("clock-time");
        const dateEl = document.getElementById("clock-date");
 
        const DAYS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 
        function pad(n) { return String(n).padStart(2, "0"); }
 
        function tick() {
          const now  = new Date();
          let   h    = now.getHours();
          const m    = now.getMinutes();
          const s    = now.getSeconds();
          const ampm = h >= 12 ? "PM" : "AM";
          h = h % 12 || 12;
 
          timeEl.innerHTML =
            `${pad(h)}<span class="clock-colon">:</span>${pad(m)}<span class="clock-colon">:</span>${pad(s)} ${ampm}`;
 
          dateEl.textContent =
            `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
        }
 
        tick();                          // run immediately — no blank flash
        setInterval(tick, 1000);         // update every second
      })();