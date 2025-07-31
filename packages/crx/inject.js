function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

const SESSION_KEY = "GRPC_WEB_TRANSFORMED";
const addItem = (key, item) => {
  try {
    const prev = sessionStorage.getItem(SESSION_KEY) || "{}";
    const prevObj = JSON.parse(prev);
    prevObj[key] = item;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(prevObj));
    // console.log("addItem prevObj>>>> ", prevObj);
  } catch (e) {
    console.log("setItem error", e);
  }
};
const setItem = (key, item) => {
  try {
    const prev = sessionStorage.getItem(SESSION_KEY);
    if (prev) {
      const prevObj = JSON.parse(prev);
      if (prevObj[key]) {
        prevObj[key] = { ...prevObj[key], ...item };
      }
      // console.log("setItem prevObj>>>> ", prevObj);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(prevObj));
    }
  } catch (e) {
    console.log("setItem error", e);
  }
};

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
          addItem(this._key, newItem);

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
                type: "GRPC_DATA",
                buffer: responseData.buffer, // 将 Uint8Array 转换为 ArrayBuffer
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

// ✅ 统一重写 prototype 上的 open 方法
const originalOpen = OriginalXHR.prototype.open;
HookedXHR.prototype.open = function (method, url, ...rest) {
  this._method = method ? method.toLowerCase() : null;
  this._url = url;
  return originalOpen.call(this, method, url, ...rest);
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

// 监听来自 content.js 的消息，这些消息可能包含 background.js 处理后的数据
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const msg = event.data;
  if (msg.type === "GRPC_WEB_TRANSFORMED") {
    console.log("[gRPC-Web XHR transformed]:", msg.data);
    setItem(msg.key, { transformedData: msg.data });
  }
});

window.XMLHttpRequest = HookedXHR;
