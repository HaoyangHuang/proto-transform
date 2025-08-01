import {
  ET_GRPC_RESPONSE,
  ET_GRPC_TRANSFORMED,
  SESSION_STORAGE_KEY,
  MAX_STORAGE_NUMBER_LIMIT,
} from "./lib/const.js";

console.log("inject.js loaded");

function generateUUID() {
  return crypto.randomUUID();
}

const setStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(SESSION_STORAGE_KEY));
  } catch (e) {
    console.log("setItem error", e);
  }
};

const addItem = (item) => {
  try {
    const prev = sessionStorage.getItem(SESSION_STORAGE_KEY) || "[]";
    let prevArray = JSON.parse(prev);
    if (prevArray.length >= MAX_STORAGE_NUMBER_LIMIT) {
      prevArray.pop();
    }
    prevArray.unshift(item);
    setStorage(SESSION_STORAGE_KEY, prevArray);
    // console.log("addItem prevArray>>>> ", prevArray);
  } catch (e) {
    console.log("setItem error", e);
  }
};
const setItem = (key, item) => {
  try {
    const prev = sessionStorage.getItem(SESSION_STORAGE_KEY) || "[]";
    const prevArray = JSON.parse(prev);
    const idx = prevArray.findIndex((item) => item.key === key);
    if (idx > -1) {
      prevArray[idx] = { ...prevArray[idx], ...item };
    } else {
      prevArray.unshift(item);
    }
    // console.log("setItem prevArray>>>> ", prevArray);
    setStorage(SESSION_STORAGE_KEY, prevArray);
  } catch (e) {
    console.log("setItem error", e);
  }
};

function parseHeaders(headerStr) {
  const headers = {};
  if (!headerStr) return headers;

  headerStr
    .trim()
    .split(/[\r\n]+/)
    .forEach((line) => {
      const parts = line.split(": ");
      const key = parts.shift().toLowerCase();
      const value = parts.join(": ");
      headers[key] = value;
    });
  return headers;
}

const OriginalXHR = window.XMLHttpRequest;
class HookedXHR extends OriginalXHR {
  constructor() {
    super();
    this._method = null;
    this._url = null;
    this._key = null;

    this.addEventListener("readystatechange", () => {
      if (this.readyState === 4 && this._method === "post") {
        // 获取响应头，返回字符串，格式是每行 'Name: Value'
        const headersStr = this.getAllResponseHeaders();
        const headers = parseHeaders(headersStr);

        const contentType = headers["content-type"] || "";
        if (contentType.includes("application/grpc-web")) {
          this._key = generateUUID();
          const newItem = {
            key: this._key,
            url: this._url,
            time: new Date(),
          };
          addItem(newItem);

          // 是 grpc-web POST 请求，处理响应体
          const responseData =
            this.responseType === "arraybuffer"
              ? new Uint8Array(this.response)
              : null;
          // console.log("XHR response data", responseData);
          if (responseData) {
            // 直接将数据发送给 content.js，由 content.js 转发给 background.js
            window.postMessage(
              {
                type: ET_GRPC_RESPONSE,
                buffer: responseData.buffer,
                url: this._url,
                key: this._key,
              },
              "*"
            );
          }
        }
      }
    });
  }
}

const originalOpen = OriginalXHR.prototype.open;
HookedXHR.prototype.open = function (method, url, ...rest) {
  this._method = method ? method.toLowerCase() : null;
  this._url = url;
  return originalOpen.call(this, method, url, ...rest);
};

// 监听来自 content.js 的消息，这些消息可能包含 background.js 处理后的数据
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const msg = event.data;
  if (msg.type === ET_GRPC_TRANSFORMED) {
    console.log("[gRPC-Web XHR transformed]:", msg);
    setItem(msg.key, { transformedData: msg.data });
  }
});

window.XMLHttpRequest = HookedXHR;
