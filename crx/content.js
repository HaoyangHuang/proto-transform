// content.js
console.log("content.js loaded");

// 注入脚本到页面上下文执行（必须用 script 标签插入，因为 content script 和页面环境隔离）
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.type = "module";
document.documentElement.appendChild(script);

const port = chrome.runtime.connect({ name: "myChannel" });
port.onMessage.addListener((msg) => {
  console.log("收到 background 的消息:", msg);
  if (msg.type === "GRPC_WEB_TRANSFORMED") {
    window.postMessage(
      {
        type: "GRPC_WEB_TRANSFORMED",
        data: msg.data,
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
    // console.log("content.js 收到 GRPC_DATA 消息:", msg.buffer);
    port.postMessage({
      type: "GRPC_DATA",
      buffer: new Uint8Array(msg.buffer),
      url: msg.url,
    });
  }
});
