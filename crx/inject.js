const OriginalXHR = window.XMLHttpRequest;

class HookedXHR extends OriginalXHR {
  constructor() {
    super();
    this._method = null;
    this._url = null;

    this.addEventListener("readystatechange", () => {
      if (this.readyState === 4 && this._method === "post") {
        // 获取响应头，返回字符串，格式是每行 'Name: Value'
        const headersStr = this.getAllResponseHeaders();
        const headers = parseHeaders(headersStr);

        const contentType = headers["content-type"] || "";
        if (contentType.includes("application/grpc-web")) {
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

// handleGrpcResponse 函数不再需要，因为数据直接从 HookedXHR 发送
// function handleGrpcResponse(uint8Array) {
//   // Convert Uint8Array to a regular array for JSON serialization
//   const dataToSend = Array.from(uint8Array);

//   window.postMessage(
//     {
//       type: "GRPC_WEB_BINARY",
//       data: dataToSend, // postMessage 不支持 Uint8Array 直接传
//     },
//     "*"
//   );
// }

// 监听来自 content.js 的消息，这些消息可能包含 background.js 处理后的数据
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const msg = event.data;
  if (msg.type === "GRPC_WEB_TRANSFORMED") {
    console.log("[gRPC-Web XHR transformed]:", msg.data);
  }
});

window.XMLHttpRequest = HookedXHR;
