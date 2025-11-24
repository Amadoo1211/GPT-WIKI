const API_BASE = "http://localhost:3001";

const getAuthState = async () => {
  const data = await chrome.storage.local.get(["authToken", "user", "credits"]);
  return {
    token: data.authToken || null,
    user: data.user || null,
    credits: data.credits || 0,
  };
};

const setAuthState = async (token, user) => {
  await chrome.storage.local.set({ authToken: token, user, credits: user?.credits ?? 0 });
};

const callApi = async (path, options = {}) => {
  const { token } = await getAuthState();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "API request failed");
  }
  return data;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.type === "saveAuth") {
        await setAuthState(request.token, request.user);
        return sendResponse({ ok: true });
      }
      if (request.type === "getAuth") {
        const state = await getAuthState();
        return sendResponse(state);
      }
      if (request.type === "api") {
        const data = await callApi(request.path, request.options);
        if (data?.user?.credits !== undefined) {
          await chrome.storage.local.set({ credits: data.user.credits });
        }
        return sendResponse({ data });
      }
      if (request.type === "logout") {
        await chrome.storage.local.clear();
        return sendResponse({ ok: true });
      }
      if (request.type === "openSidebar") {
        if (chrome.sidePanel) {
          await chrome.sidePanel.setOptions({ path: "sidebar.html" });
          await chrome.sidePanel.open({ windowId: sender.tab?.windowId || (await chrome.windows.getCurrent()).id });
        }
        return sendResponse({ ok: true });
      }
    } catch (error) {
      console.error("Background error", error);
      sendResponse({ error: error.message });
    }
  })();
  return true;
});

chrome.action.onClicked.addListener(async () => {
  if (chrome.sidePanel) {
    await chrome.sidePanel.setOptions({ path: "sidebar.html" });
    await chrome.sidePanel.open({});
  }
});
