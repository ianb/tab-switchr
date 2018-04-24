/* global buildSettings */

const MAX_RECENT_TABS = 5;
const TAB_IDLE_TIME = 1000;

let lastActivatedId;
let recentTabIds = [];

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (tabId !== lastActivatedId) {
    lastActivatedId = tabId;
    setTimeout(() => {
      if (lastActivatedId === tabId) {
        let tab = browser.tabs.get(tabId);
        addRecentTabId(tabId);
      }
    }, TAB_IDLE_TIME);
  }
});

/* eslint-disable consistent-return */
// Because this dispatches to different kinds of functions, its return behavior is inconsistent
browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === "getRecent") {
    return Promise.resolve(recentTabIds);
  } else {
    console.error("Unexpected message to background:", message);
  }
});
/* eslint-enable consistent-return */


async function addRecentTabId(tabId) {
  recentTabIds = recentTabIds.filter((t2) => t2 !== tabId);
  recentTabIds.unshift(tabId);
  recentTabIds.splice(MAX_RECENT_TABS);
  try {
    await browser.runtime.sendMessage({
      type: "updateRecentTabs",
      recentTabIds
    });
  } catch (error) {
    if (String(error).includes("Could not establish connection")) {
      // We're just speculatively sending messages to the popup, it might not be open,
      // and that is fine
    } else {
      console.error("Got updating recent tabs:", String(error), error);
    }
  }
}

async function init() {
  let activeTabs = await browser.tabs.query({active: true});
  for (let tab of activeTabs) {
    addRecentTabId(tab.id);
  }
}

init();
