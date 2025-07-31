// content.js
console.log("content.js loaded");

// 注入脚本到页面上下文执行（必须用 script 标签插入，因为 content script 和页面环境隔离）
const injectScript = document.createElement("script");
injectScript.src = chrome.runtime.getURL("inject.js");
injectScript.type = "module";
document.documentElement.appendChild(injectScript);

document.addEventListener("DOMContentLoaded", () => {
  const div = document.createElement("div");
  div.id = "root";
  Object.assign(div.style, {
    position: "fixed",
    top: "70%",
    right: "0",
    zindex: "9999",
  });
  document.body.appendChild(div);
  const showScript = document.createElement("script");
  showScript.src = chrome.runtime.getURL("show/index.js");
  showScript.type = "module";
  document.documentElement.appendChild(showScript);
});

const port = chrome.runtime.connect({ name: "myChannel" });
port.onMessage.addListener((msg) => {
  // console.log("收到 background 的消息:", msg);
  if (msg.type === "GRPC_WEB_TRANSFORMED") {
    window.postMessage(
      {
        ...msg,
        type: "GRPC_WEB_TRANSFORMED",
      },
      "*"
    );
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const msg = event.data;
  if (msg.type === "GRPC_DATA") {
    // inject.js 已经发送了 ArrayBuffer，直接转发给 background.js
    // console.log("content.js 收到 GRPC_DATA 消息:", msg);
    port.postMessage({
      ...msg,
      type: "GRPC_DATA",
      buffer: new Uint8Array(msg.buffer),
    });
  }
});
