import fs from "fs";
import path from "path";
import protobuf from "protobufjs";
import { PROTO_ROOT } from "./const";
import { request } from "http";

// {
//   fullPath: {
//       KpDepositsService: [
//           ['TerminalCreateDeposit', 'TerminalCreateDepositRequest', 'CreateDepositResponse']
//       ]
//   }
// }
const ServiceInfoMap: Record<
  string,
  Record<string, [string, string, string][] | undefined> | undefined
> = {};

// 递归遍历目录下的所有 .proto 文件
function findProtoFiles(dir: string, protoFiles: string[] = []) {
  try {
    const files = fs.readdirSync(dir);
    // console.log("findProtoFiles files >>> ", files);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        findProtoFiles(fullPath, protoFiles);
      } else if (file.endsWith(".proto")) {
        protoFiles.push(fullPath);
      }
    }
    return protoFiles;
  } catch (e) {
    console.log("findProtoFiles error >>> ", e);
    return [];
  }
}

// 解析 proto 文件，提取 service 和 rpc 定义
(function parseProtoServices(protoDir: string) {
  const protoFiles = findProtoFiles(protoDir);

  for (const file of protoFiles) {
    const content = fs.readFileSync(file, "utf8");

    const fileResult: Record<string, [string, string, string][]> = {};
    const serviceRegex = /service\s+(\w+)\s*{([\s\S]*?)}/g;
    let serviceMatch;

    while ((serviceMatch = serviceRegex.exec(content)) !== null) {
      const [, serviceName, body] = serviceMatch;
      const rpcList: [string, string, string][] = [];

      const rpcRegex =
        /rpc\s+(\w+)\s*\(\s*(\w+)\s*\)\s+returns\s*\(\s*(\w+)\s*\)/g;
      let rpcMatch;
      while ((rpcMatch = rpcRegex.exec(body)) !== null) {
        const [, rpcName, requestType, responseType] = rpcMatch;
        rpcList.push([rpcName, requestType, responseType]);
      }

      if (rpcList.length > 0) {
        fileResult[serviceName] = rpcList;
      }
    }

    if (Object.keys(fileResult).length > 0) {
      ServiceInfoMap[file] = fileResult;
    }
  }

  return ServiceInfoMap;
})(PROTO_ROOT);
// console.log("ServiceInfoMap >>> ", JSON.stringify(ServiceInfoMap, null, 2));

function getProtoInfo(url: string) {
  try {
    console.log("getProtoInfo url >>> ", url);
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/.+\.([^/.]+)\/([^/]+)$/);
    if (!match) return null;

    const [_, serviceName, methodName] = match;

    let protoPath = "",
      requestType = "",
      responseType = "";
    for (const [path, protoInfo] of Object.entries(ServiceInfoMap)) {
      if (!protoInfo) continue;
      for (const [service, methodList] of Object.entries(protoInfo)) {
        if (!methodList) continue;
        if (service === serviceName) {
          const target = methodList.find((item) => item[0] === methodName);
          if (!target) break;
          protoPath = path.replace(PROTO_ROOT, "");
          requestType = target[1];
          responseType = target[2];
          break;
        }
      }
    }

    return {
      service: serviceName,
      method: methodName,
      protoPath,
      requestType,
      responseType,
    };
  } catch (e) {
    console.log("getProtoInfo error >>> ", e);
  }
}

export async function trans2Json(url: string, buffer: Uint8Array) {
  try {
    const protoInfo = getProtoInfo(url);
    console.log("protoInfo >>> ", protoInfo);

    if (!protoInfo) return null;

    // 加载 proto
    const root = new protobuf.Root();
    root.resolvePath = function (origin, target) {
      return PROTO_ROOT + target;
    };
    await root.load(protoInfo.protoPath, { keepCase: true });
    // console.log("root >>> ", root);
    const MessageType = root.lookupType(protoInfo.responseType);

    // 解码
    const message = MessageType.decode(buffer);

    // 转 JSON（可选：加上 { enums: String, longs: String } 等选项）
    const object = MessageType.toObject(message, {
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    // 输出 JSON
    const json = JSON.stringify(object, null, 2);
    // console.log("trans2Json json >>>>>>>\n", json);
    return json;
  } catch (e) {
    console.log("trans2Json error >>>>\n", e);
  }
}
