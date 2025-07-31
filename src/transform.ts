import fs from "fs";
import path from "path";
import protobuf from "protobufjs";
import { PROTO_ROOT } from "./const";

// 指定入口 proto 文件
// const ENTRY_PROTO = "com/kodypay/grpc/deposits/deposits.proto";
// const MESSAGE_TYPE = "com.kodypay.grpc.deposits.GetPaginatedDepositsResponse";

// const root = new protobuf.Root();
// root.resolvePath = function (origin, target) {
//   return PROTO_ROOT + target;
// };

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

function getProtoInfo(url: string) {
  try {
    console.log("getProtoInfo url >>> ", url);
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/(.+)\.([^/.]+)\/([^/]+)$/);
    if (!match) return null;

    const [_, pkgPath, serviceName, methodName] = match;

    let protoFile = "";
    const protoFiles = findProtoFiles("proto/");
    for (const file of protoFiles) {
      const content = fs.readFileSync(file, "utf8");

      // 正则匹配 service DepositService
      const regex = new RegExp(`service\\s+${serviceName}\\b`);
      if (regex.test(content)) {
        console.log("findProtoByService file >>> ", file);
        protoFile = file.replace(PROTO_ROOT, "");
      }
    }

    return {
      protoFile: protoFile,
      service: serviceName,
      method: methodName,
      responseType: methodName + "Response",
    };
  } catch (e) {
    console.log("getProtoInfo error >>> ", e);
  }
}

export async function trans2Json(url: string, buffer: Uint8Array) {
  try {
    const root = new protobuf.Root();
    root.resolvePath = function (origin, target) {
      return PROTO_ROOT + target;
    };

    const protoInfo = getProtoInfo(url);
    console.log("protoInfo >>> ", protoInfo);

    if (!protoInfo) return null;

    // 加载 proto
    await root.load(protoInfo.protoFile, { keepCase: true });
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
    console.log("trans2Json json >>>>>>>\n", json);
    return json;
  } catch (e) {
    console.log("trans2Json error >>>>\n", e);
  }
}
