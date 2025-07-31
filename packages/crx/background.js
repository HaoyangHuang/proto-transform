// background.js

console.log("Proto Transform Extension background script running.");

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    console.log("[background.js] Received message:", msg);
    if (msg.type === "GRPC_DATA") {
      //   const uint8Array = new Uint8Array(msg.buffer);
      const dataToSend = Object.values(msg.buffer);

      fetch("http://localhost:3000/transform", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: dataToSend, url: msg.url }),
      })
        .then(async (response) => {
          console.log(
            "[gRPC-Web XHR transform response in background]:",
            response
          );
          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              "[gRPC-Web XHR transform failed in background - HTTP Error]:",
              response.status,
              errorText
            );
            throw new Error(
              `HTTP error! status: ${response.status}, body: ${errorText}`
            );
          }
          return response.json();
        })
        .then((jsonResult) => {
          console.log("[gRPC-Web XHR transformed in background]:", jsonResult);
          port.postMessage({
            type: "GRPC_WEB_TRANSFORMED",
            data: jsonResult,
          });
        })
        .catch((error) => {
          console.error(
            "[gRPC-Web XHR transform failed in background]:",
            error
          );
          port.postMessage({
            type: "GRPC_WEB_TRANSFORMED_ERROR",
            error: error.message,
          });
        });
    }
  });
});
