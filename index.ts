import http from "http";
import { trans2Json } from "./src/transform";
import { purifyProto } from "./src/purify-proto";

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/transform") {
    let body: Uint8Array[] = [];
    req.on("data", (chunk) => {
      body.push(chunk);
    });
    req.on("end", async () => {
      try {
        const requestBody = JSON.parse(Buffer.concat(body).toString());
        const uint8Array = new Uint8Array(requestBody.data);
        // console.log("req.body", requestBody);
        const purifiedBuffer = purifyProto(uint8Array);
        if (!purifiedBuffer) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal Server Error" }));
          return;
        }
        const jsonResult = await trans2Json(requestBody.url, purifiedBuffer);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(jsonResult !== null ? jsonResult : JSON.stringify({}));
      } catch (error) {
        // console.error("Error processing request:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal Server Error" }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
