let recentTabIds = [];
const rerenderEvents = ["onUpdated", "onRemoved", "onCreated", "onMoved", "onDetached", "onAttached"];

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
        recentTabs.push(tab);
      }
    }
  }
  renderTabList(tabs, "#open-tabs-list", "existing-tab");
  renderTabList(recentTabs, "#recent-tabs-list", "recent-tab");
}

let renderTabListLastRendered = {};

function renderTabList(tabs, containerSelector, eventLabel) {
  let renderedInfo = "";
  const tabList = element(containerSelector);
  const newTabList = tabList.cloneNode();
  tabs.forEach((tab, index) => {
    let li = document.createElement("li");
    let image = document.createElement("span");
    let text = document.createElement("span");
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
    anchor.prepend(image);
    anchor.appendChild(text);
    li.appendChild(anchor);
    newTabList.appendChild(li);
  });
  if (renderedInfo !== renderTabListLastRendered[containerSelector]) {
    tabList.replaceWith(newTabList);
    renderTabListLastRendered[containerSelector] = renderedInfo;
  }
}

function focusTab(tabId) {
  browser.tabs.update(tabId, {active: true});
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
  updateHome();
}

init();
