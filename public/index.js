"use strict";

// ==========================================
// GHOST BROWSER — MAIN JAVASCRIPT
// ==========================================

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");

const homeForm = document.getElementById("home-form");
const homeAddress = document.getElementById("home-address");
const homeView = document.getElementById("home-view");
const workspace = document.getElementById("workspace");
const framesContainer = document.getElementById("frames-container");
const tabList = document.getElementById("tab-list");

// ==========================================
// CUSTOM LOGOS
// ==========================================

const CUSTOM_LOGOS = {
  "youtube.com":
    "https://www.youtube.com/s/desktop/a6171d17/img/favicon.ico",

  "tiktok.com":
    "https://www.tiktok.com/favicon.ico",

  "roblox.com":
    "https://www.roblox.com/favicon.ico",

  "robtopgames.com":
    "https://robtopgames.com/favicon.ico",

  "kick.com":
    "https://kick.com/favicon.ico",

  "twitch.tv":
    "https://twitch.tv/favicon.ico",

  "snapchat.com":
    "https://static.snapchat.com/favicon.ico",

  "instagram.com":
    "https://static.cdninstagram.com/rsrc.php/yr/r/rzWiSjZRxk5.webp",

  "discord.com":
    "https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/6266bc493fb42d4e27bb8393_847541504914fd33810e70a0ea73177e.ico"
};

// Get the correct logo for a website.
function getFaviconUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    for (const [domain, logo] of Object.entries(CUSTOM_LOGOS)) {
      if (
        hostname === domain ||
        hostname.endsWith("." + domain)
      ) {
        return logo;
      }
    }

    // Fallback for websites without a custom logo.
    return (
      "https://www.google.com/s2/favicons?domain=" +
      encodeURIComponent(hostname) +
      "&sz=64"
    );
  } catch {
    return "";
  }
}

// ==========================================
// SCRAMJET SETUP
// ==========================================

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js"
  }
});

scramjet.init();

const connection = new BareMux.BareMuxConnection(
  "/baremux/worker.js"
);

// ==========================================
// TAB SYSTEM
// ==========================================

let nextTabId = 1;
let activeTabId = "home";
const tabs = new Map();

function createHomeTab() {
  return {
    id: "home",
    title: "Home",
    home: true,
    url: "",
    frame: null,
    history: [],
    historyIndex: -1
  };
}

tabs.set("home", createHomeTab());

function getTitle(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || "New tab";
  } catch {
    return "New tab";
  }
}

function showError(message = "", details = "") {
  error.textContent = message;
  errorCode.textContent = details;
}

// ==========================================
// RENDER SIDEBAR TABS
// ==========================================

function renderTabs() {
  tabList.replaceChildren();

  for (const tab of tabs.values()) {
    const item = document.createElement("div");

    item.className =
      "tab-item" +
      (tab.id === activeTabId ? " active" : "");

    item.title = tab.title;
    item.setAttribute("role", "button");
    item.tabIndex = 0;

    const icon = document.createElement("span");
    icon.className = "tab-icon";

    if (tab.home) {
      icon.textContent = "⌂";
    } else {
      const favicon = document.createElement("img");

      favicon.className = "tab-favicon";
      favicon.alt = "";
      favicon.loading = "lazy";
      favicon.src = getFaviconUrl(tab.url);

      favicon.addEventListener(
        "error",
        () => {
          icon.replaceChildren();
          icon.textContent = "◈";
        },
        { once: true }
      );

      icon.appendChild(favicon);
    }

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.title;

    item.append(icon, title);

    if (!tab.home || tabs.size > 1) {
      const close = document.createElement("button");

      close.className = "tab-close";
      close.type = "button";
      close.textContent = "×";
      close.title = "Close tab";
      close.setAttribute(
        "aria-label",
        "Close " + tab.title
      );

      close.addEventListener("click", event => {
        event.stopPropagation();
        closeTab(tab.id);
      });

      item.appendChild(close);
    }

    item.addEventListener("click", () => {
      activateTab(tab.id);
    });

    item.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateTab(tab.id);
      }
    });

    tabList.appendChild(item);
  }
}

// ==========================================
// ACTIVATE A TAB
// ==========================================

function activateTab(id) {
  const tab = tabs.get(id);
  if (!tab) return;

  activeTabId = id;

  homeView.style.display = tab.home ? "flex" : "none";
  workspace.classList.toggle("has-frame", !tab.home);

  // Keep each tab mounted while showing the selected one.
  for (const other of tabs.values()) {
    const element = other.frame?.frame;
    if (!element) continue;

    const selected = other.id === id;

    element.classList.toggle("active", selected);
    element.style.display = selected ? "block" : "none";
    element.style.zIndex = selected ? "2" : "1";
  }

  address.value = tab.home ? "" : tab.url;
  homeAddress.value = "";

  showError();
  renderTabs();
}

// ==========================================
// CREATE AND CLOSE TABS
// ==========================================

function createTab(id, home = true) {
  const tab = {
    id,
    title: home ? "Home" : "New tab",
    home,
    url: "",
    frame: null,
    history: [],
    historyIndex: -1
  };

  tabs.set(id, tab);
  return tab;
}

function newTab() {
  const id = "tab-" + nextTabId++;
  const tab = createTab(id, true);

  activateTab(tab.id);

  return tab;
}

function ensureFrame(tab) {
  if (tab.frame) return tab.frame;

  const frame = scramjet.createFrame();

  frame.frame.id = "ghost-frame-" + tab.id;
  frame.frame.title = tab.title;
  frame.frame.style.display = "none";
  frame.frame.classList.remove("active");

  framesContainer.appendChild(frame.frame);

  tab.frame = frame;

  return frame;
}

function closeTab(id) {
  const tab = tabs.get(id);
  if (!tab) return;

  // Keep Home if it's the only tab.
  if (tab.home && tabs.size === 1) return;

  if (tab.frame?.frame) {
    tab.frame.frame.remove();
  }

  tabs.delete(id);

  if (tabs.size === 0) {
    tabs.set("home", createHomeTab());
  }

  if (activeTabId === id || !tabs.has(activeTabId)) {
    const remaining = [...tabs.keys()];

    const nextId = remaining.includes("home")
      ? "home"
      : remaining[0];

    activateTab(nextId);
  } else {
    renderTabs();
  }
}

// ==========================================
// NAVIGATION
// ==========================================

async function navigateTab(
  tab,
  destination,
  addHistory = true
) {
  if (!tab) tab = newTab();

  showError();

  try {
    await registerSW();
  } catch (err) {
    showError(
      "Failed to register the service worker.",
      String(err)
    );
    return;
  }

  try {
    const wispUrl =
      (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.host +
      "/wisp/";

    if (
      (await connection.getTransport()) !==
      "/libcurl/index.mjs"
    ) {
      await connection.setTransport(
        "/libcurl/index.mjs",
        [{ websocket: wispUrl }]
      );
    }

    const frame = ensureFrame(tab);

    tab.home = false;
    tab.url = destination;
    tab.title = getTitle(destination);

    if (addHistory) {
      tab.history = tab.history.slice(
        0,
        tab.historyIndex + 1
      );

      tab.history.push(destination);
      tab.historyIndex = tab.history.length - 1;
    }

    frame.frame.title = tab.title;

    activateTab(tab.id);
    frame.go(destination);

    address.value = destination;

    renderTabs();
  } catch (err) {
    showError(
      "Couldn't open this address.",
      String(err)
    );
  }
}

function searchAndNavigate(value) {
  const destination = search(
    value,
    searchEngine.value
  );

  if (!destination) return;

  let tab = tabs.get(activeTabId);

  // Searches from Home open a new tab.
  if (!tab || tab.home) {
    tab = newTab();
  }

  navigateTab(tab, destination);
}

// ==========================================
// SEARCH FORMS
// ==========================================

form.addEventListener("submit", event => {
  event.preventDefault();
  searchAndNavigate(address.value);
});

homeForm.addEventListener("submit", event => {
  event.preventDefault();
  searchAndNavigate(homeAddress.value);
});

// ==========================================
// HOMEPAGE SHORTCUTS
// ==========================================

document
  .querySelectorAll(".shortcut[data-url]")
  .forEach(button => {
    button.addEventListener("click", () => {
      let tab = tabs.get(activeTabId);

      if (!tab || tab.home) {
        tab = newTab();
      }

      navigateTab(tab, button.dataset.url);
    });
  });

// ==========================================
// NEW TAB BUTTON
// ==========================================

document
  .getElementById("rail-new-tab")
  .addEventListener("click", newTab);

// ==========================================
// BACK BUTTON
// ==========================================

document.getElementById("back").addEventListener(
  "click",
  () => {
    const tab = tabs.get(activeTabId);
    if (!tab?.frame) return;

    if (typeof tab.frame.back === "function") {
      tab.frame.back();
      return;
    }

    if (tab.historyIndex > 0) {
      tab.historyIndex--;

      navigateTab(
        tab,
        tab.history[tab.historyIndex],
        false
      );
    }
  }
);

// ==========================================
// FORWARD BUTTON
// ==========================================

document.getElementById("forward").addEventListener(
  "click",
  () => {
    const tab = tabs.get(activeTabId);
    if (!tab?.frame) return;

    if (typeof tab.frame.forward === "function") {
      tab.frame.forward();
      return;
    }

    if (tab.historyIndex < tab.history.length - 1) {
      tab.historyIndex++;

      navigateTab(
        tab,
        tab.history[tab.historyIndex],
        false
      );
    }
  }
);

// ==========================================
// RELOAD BUTTON
// ==========================================

document.getElementById("reload").addEventListener(
  "click",
  () => {
    const tab = tabs.get(activeTabId);

    if (!tab?.frame || !tab.url) return;

    if (typeof tab.frame.reload === "function") {
      tab.frame.reload();
    } else {
      tab.frame.go(tab.url);
    }
  }
);

// ==========================================
// START GHOST
// ==========================================

renderTabs();
activateTab("home");