const API_BASE = "http://localhost:3001";
let googleClientId = null;

const messageEl = document.getElementById("message");
const creditsEl = document.getElementById("credits");
const planEl = document.getElementById("plan");
const logoutBtn = document.getElementById("logout");
const buyCreditsBtn = document.getElementById("buy-credits");
const openSidebarBtn = document.getElementById("open-sidebar");

const setMessage = (text, success = false) => {
  messageEl.textContent = text;
  messageEl.style.color = success ? "#22d3ee" : "#f87171";
};

const refreshStatus = async () => {
  const state = await chrome.runtime.sendMessage({ type: "getAuth" });
  if (state?.user) {
    creditsEl.textContent = `Credits: ${state.user.credits}`;
    planEl.textContent = `Plan: ${state.user.subscriptionStatus}`;
  } else {
    creditsEl.textContent = "Credits: --";
    planEl.textContent = "Plan: Free";
  }
};

const saveAuth = async (token, user) => {
  await chrome.runtime.sendMessage({ type: "saveAuth", token, user });
  await refreshStatus();
};

const sendMagicLink = async () => {
  const email = prompt("Enter your email for the magic link");
  if (!email) return;
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to send magic link");
    setMessage("Magic link sent. Paste the token from your email to finish.", true);
    const token = prompt("Paste the token from your email link");
    if (token) {
      await completeMagicLogin(token, email);
    }
  } catch (error) {
    setMessage(error.message);
  }
};

const completeMagicLogin = async (token, email) => {
  const response = await fetch(`${API_BASE}/auth/login?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Magic link invalid");
  }
  await saveAuth(data.token, data.user);
  setMessage("Signed in with email", true);
};

const handleGoogleSignIn = () => {
  if (!googleClientId) {
    setMessage("Google auth unavailable");
    return;
  }
  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: async (response) => {
      try {
        const result = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: response.credential }),
        });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Google login failed");
        await saveAuth(data.token, data.user);
        setMessage("Signed in with Google", true);
      } catch (error) {
        setMessage(error.message);
      }
    },
  });
  google.accounts.id.renderButton(document.getElementById("google-btn"), {
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
  });
};

const fetchGoogleClientId = async () => {
  const response = await fetch(`${API_BASE}/auth/google/client-id`);
  const data = await response.json();
  googleClientId = data.clientId;
  if (googleClientId) {
    handleGoogleSignIn();
  }
};

document.getElementById("magic-link").addEventListener("click", sendMagicLink);
logoutBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "logout" });
  await refreshStatus();
  setMessage("Signed out", true);
});
buyCreditsBtn.addEventListener("click", async () => {
  try {
    const type = confirm("OK for subscription, Cancel for credit pack") ? "subscription" : "credit";
    const { data } = await chrome.runtime.sendMessage({
      type: "api",
      path: "/billing/create-checkout-session",
      options: { method: "POST", body: JSON.stringify({ type }) },
    });
    if (data?.url) {
      chrome.tabs.create({ url: data.url });
    }
  } catch (error) {
    setMessage(error.message);
  }
});
openSidebarBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "openSidebar" });
});

refreshStatus();
fetchGoogleClientId();
