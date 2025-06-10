chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "findSimilarMovies",
    title: "🎬 Find Similar Movies with ReelMate",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "findSimilarMovies") {
    chrome.storage.local.set({ selectedMovie: info.selectionText });
    // Optional: open popup window manually if you're not clicking the icon
  }
});