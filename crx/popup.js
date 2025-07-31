// popup.js
const jsonDisplay = document.getElementById("jsonDisplay");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PROTO_DECODED") {
    console.log("Received decoded protobuf from background:", request.data);
    jsonDisplay.textContent = JSON.stringify(JSON.parse(request.data), null, 2);
  }
});

// Optional: Request the latest decoded data when popup is opened
// This might be useful if the background script already processed some data before the popup was opened.
// chrome.runtime.sendMessage({ type: 'REQUEST_LATEST_PROTO_DATA' });
