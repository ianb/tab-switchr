let recentTabIds = [];
const rerenderEvents = ["onUpdated", "onRemoved", "onCreated", "onMoved", "onDetached", "onAttached"];
let activeTabElement;
let selectedTabElement;
let searchFilter;
let selectedTabId;
let selectedIsRecent;
let renderedRecentTabIds = [];
let renderedTabIds = [];

async function updateHome(event) {
  if (event) {
    // If this is called from an event, then often browser.windows.getCurrent() won't
    // be updated, and will return stale information, so we'll rerender a second time
    // very soon
    setTimeout(updateHome, 50);
    setTimeout(updateHome, 300);
  }
  const windowInfo = await browser.windows.getCurrent({populate: true});
  let tabs = Array.from(windowInfo.tabs);
  let recentTabs = [];
  for (let tabId of recentTabIds) {
    for (let tab of tabs) {
      if (tab.id === tabId) {
        recentTabs.push(Object.assign({}, tab));
      }
    }
  }
  if (searchFilter) {
    recentTabs = recentTabs.filter(t => matchesSearch(t, searchFilter));
    tabs = tabs.filter(t => matchesSearch(t, searchFilter));
  }
  renderedRecentTabIds = recentTabs.map(t => t.id);
  renderedTabIds = tabs.map(t => t.id);
  if (selectedTabId) {
    if (selectedIsRecent) {
      for (let tab of recentTabs) {
        if (tab.id === selectedTabId) {
          tab.selected = true;
          break;
        }
      }
    } else {
      for (let tab of tabs) {
        if (tab.id === selectedTabId) {
          tab.selected = true;
          break;
        }
      }
    }
  } else {
    if (recentTabs.length) {
      recentTabs[0].selected = true;
      selectedTabId = recentTabs[0].id;
      selectedIsRecent = true;
    }
  }
  renderTabList(tabs, "#open-tabs-list", "existing-tab", {captureActive: true, restoreScroll: true});
  renderTabList(recentTabs, "#recent-tabs-list", "recent-tab", {captureActive: false});
}

let renderTabListLastRendered = {};

function renderTabList(tabs, containerSelector, eventLabel, options) {
  let renderedInfo = "";
  let newActiveTabElement;
  let newSelectedTabElement;
  const tabList = element(containerSelector);
  const newTabList = tabList.cloneNode();
  tabs.forEach((tab, index) => {
    let li = document.createElement("li");
    let closer = document.createElement("span");
    let image = document.createElement("span");
    let text = document.createElement("span");
    closer.classList.add("tab__close");
    closer.textContent = "✖";
    image.classList.add("tab__image");
    text.classList.add("tab__text");
    let title = tab.title;
    let url = tab.url;
    let tabId = tab.id;
    let favIconUrl = null;
    if ("favIconUrl" in tab && tab.favIconUrl) {
      favIconUrl = tab.favIconUrl;
      image.style.backgroundImage = `url(${favIconUrl})`;
    }
    if (tab.active) {
      newActiveTabElement = li;
      li.classList.add("tab__active");
      renderedInfo += "ACTIVE\n";
    }
    if (tab.selected) {
      newSelectedTabElement = li;
      li.classList.add("tab__selected");
      renderedInfo += "SELECTED\n";
    }
    renderedInfo += favIconUrl + " ";
    let anchor = document.createElement("a");
    renderedInfo += url + " ";
    anchor.classList.add("tab");
    anchor.setAttribute("tabIndex", "0");
    text.textContent = title;
    renderedInfo += title + "\n";
    anchor.addEventListener("click", (event) => {
      focusTab(tabId);
    });
    closer.addEventListener("click", (event) => {
      closeTab(tabId);
      event.stopPropagation();
    });
    anchor.prepend(image);
    anchor.appendChild(text);
    anchor.appendChild(closer);
    li.appendChild(anchor);
    newTabList.appendChild(li);
  });
  if (renderedInfo !== renderTabListLastRendered[containerSelector]) {
    let oldScroll = tabList.scrollTop;
    tabList.replaceWith(newTabList);
    renderTabListLastRendered[containerSelector] = renderedInfo;
    if (options.captureActive) {
      activeTabElement = newActiveTabElement;
      selectedTabElement = newSelectedTabElement;
    }
    if (options.restoreScroll) {
      newTabList.scrollTop = oldScroll;
    }
  }
}

function matchesSearch(tab, term) {
  let params = `${tab.url} ${tab.title}`;
  if (term.toLowerCase() === term) {
    params = `${tab.url.toLowerCase()} ${tab.title.toLowerCase()}`;
  }
  return params.includes(term);
}

function focusTab(tabId) {
  browser.tabs.update(tabId, {active: true});
}

async function closeTab(tabId) {
  await browser.tabs.remove(tabId);
  updateHome({});
}

function element(selector) {
  return document.querySelector(selector);
}

element(".feedback-button").addEventListener("click", () => {
  /*sendEvent({
    ec: "interface",
    ea: "button-click",
    el: "feedback",
    forUrl: lastDisplayedUrl,
  });*/
});

element("#tab-switchr-search").addEventListener("keydown", (event) => {
  if (event.code === "Enter") {
    if (selectedTabId) {
      focusTab(selectedTabId);
      window.close();
    }
  } else if (event.code === "KeyX" && event.altKey) {
    let closeTabId = selectedTabId;
    movePosition(1);
    closeTab(closeTabId);
  } else if (event.code === "ArrowUp") {
    movePosition(-1);
  } else if (event.code === "ArrowDown") {
    movePosition(1);
  } else {
    searchFilter = event.target.value;
    updateHome();
    return;
  }
  event.stopPropagation();
  event.preventDefault();
  updateHome();
  if (selectedTabElement) {
    selectedTabElement.scrollIntoView();
  }
});

function movePosition(dir) {
  if (!selectedTabId
    || (selectedIsRecent && renderedRecentTabIds.indexOf(selectedTabId) === -1)
    || (!selectedIsRecent && renderedTabIds.indexOf(selectedTabId) === -1)) {
    if (renderedRecentTabIds.length) {
      selectedTabId = renderedRecentTabIds[0];
      selectedIsRecent = true;
    } else {
      selectedTabId = renderedTabIds[0];
      selectedIsRecent = false;
    }
    return;
  }
  if (selectedIsRecent) {
    let pos = renderedRecentTabIds.indexOf(selectedTabId);
    let length = renderedRecentTabIds.length;
    if (dir === 1) {
      if (pos === length - 1) {
        selectedIsRecent = false;
        selectedTabId = renderedTabIds[0];
      } else {
        selectedTabId = renderedRecentTabIds[pos + 1];
      }
    } else {
      if (pos === 0) {
        selectedIsRecent = false;
        selectedTabId = renderedTabIds[renderedTabIds.length - 1];
      } else {
        selectedTabId = renderedRecentTabIds[pos - 1];
      }
    }
  } else {
    let pos = renderedTabIds.indexOf(selectedTabId);
    let length = renderedTabIds.length;
    if (dir === 1) {
      if (pos === length - 1) {
        selectedIsRecent = true;
        selectedTabId = renderedRecentTabIds[0];
      } else {
        selectedTabId = renderedTabIds[pos + 1];
      }
    } else {
      if (pos === 0) {
        selectedIsRecent = true;
        selectedTabId = renderedRecentTabIds[renderedRecentTabIds.length - 1];
      } else {
        selectedTabId = renderedTabIds[pos - 1];
      }
    }
  }
}

async function init() {
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === "updateRecentTabs") {
      recentTabIds = message.recentTabIds;
      updateHome();
    } else if (["setDesktop", "sendEvent", "sidebarOpened", "sidebarOpenedPage", "sidebarDisplayedHome", "getRecentTabs"].includes(message.type)) {
      // These intended to go to the backgrond and can be ignored here
    } else {
      console.error("Got unexpected message:", message);
    }
  });

  recentTabIds = await browser.runtime.sendMessage({
    type: "getRecent"
  });
  await updateHome();
  if (activeTabElement) {
    activeTabElement.scrollIntoView();
  }
}

init();
