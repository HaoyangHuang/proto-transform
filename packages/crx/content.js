console.log("content.js loaded");

// import { ET_GRPC_RESPONSE } from "./lib/const.js"; content 没法import
const ET_GRPC_RESPONSE = "ET_GRPC_RESPONSE";
const ET_GRPC_TRANSFORMED = "ET_GRPC_TRANSFORMED";

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
  showScript.src = chrome.runtime.getURL("lib/show/index.js");
  showScript.type = "module";
  document.documentElement.appendChild(showScript);
});

const port = chrome.runtime.connect({ name: "myChannel" });
port.onMessage.addListener((msg) => {
  // console.log("收到 background 的消息:", msg);
  if (msg.type === ET_GRPC_TRANSFORMED) {
    window.postMessage(
      {
        ...msg,
        type: ET_GRPC_TRANSFORMED,
      },
      "*"
    );
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const msg = event.data;
  if (msg.type === ET_GRPC_RESPONSE) {
    // console.log("content.js 收到 ET_GRPC_RESPONSE 消息:", msg);
    port.postMessage({
      ...msg,
      type: ET_GRPC_RESPONSE,
      buffer: new Uint8Array(msg.buffer),
    });
  }
});
