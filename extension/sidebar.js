const chatFeed = document.getElementById("chat-feed");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const loadingEl = document.getElementById("loading");
const creditDisplay = document.getElementById("credit-display");

const appendMessage = (role, content) => {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = content;
  chatFeed.appendChild(div);
  chatFeed.scrollTop = chatFeed.scrollHeight;
};

const setLoading = (isLoading) => {
  loadingEl.classList.toggle("hidden", !isLoading);
};

const fetchCredits = async () => {
  const { data } = await chrome.runtime.sendMessage({ type: "api", path: "/users/me" });
  if (data?.user?.credits !== undefined) {
    creditDisplay.textContent = `Credits: ${data.user.credits}`;
  }
};

const callChat = async (message) => {
  appendMessage("user", message);
  setLoading(true);
  try {
    const { data } = await chrome.runtime.sendMessage({
      type: "api",
      path: "/chat",
      options: { method: "POST", body: JSON.stringify({ message }) },
    });
    appendMessage("ai", data.reply || "No response");
    await fetchCredits();
  } catch (error) {
    appendMessage("ai", error.message || "Request failed");
  } finally {
    setLoading(false);
  }
};

const callDeepResearch = async (query) => {
  appendMessage("user", `Deep research: ${query}`);
  setLoading(true);
  try {
    const { data } = await chrome.runtime.sendMessage({
      type: "api",
      path: "/deep-research",
      options: { method: "POST", body: JSON.stringify({ query }) },
    });
    const sources = data.sources
      .map((s) => `- ${s.title} (${s.url})`)
      .join("\n");
    appendMessage("ai", `${data.summary}\n\nSources:\n${sources}`);
    await fetchCredits();
  } catch (error) {
    appendMessage("ai", error.message || "Deep research failed");
  } finally {
    setLoading(false);
  }
};

const summarizePage = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  const [{ result: pageContent }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const selection = window.getSelection()?.toString();
      const bodyText = document.body.innerText || "";
      const snippet = selection && selection.length > 20 ? selection : bodyText.slice(0, 3000);
      return snippet;
    },
  });
  const prompt = `Summarize this page in 5 bullet points and one-sentence verdict.\nURL: ${tab.url}\nTitle: ${tab.title}\nContent: ${pageContent}`;
  await callChat(prompt);
};

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  chatInput.value = "";
  await callChat(message);
});

Array.from(document.querySelectorAll(".actions button")).forEach((btn) => {
  btn.addEventListener("click", async () => {
    const action = btn.dataset.action;
    if (action === "deep-research") {
      const query = prompt("Topic for deep research");
      if (query) await callDeepResearch(query);
    }
    if (action === "summarize") {
      await summarizePage();
    }
    if (action === "ask") {
      chatInput.focus();
    }
  });
});

document.getElementById("refresh").addEventListener("click", fetchCredits);

fetchCredits();
appendMessage("ai", "Welcome to GPT-Wiki PRO. Ask anything or start Deep Research.");
