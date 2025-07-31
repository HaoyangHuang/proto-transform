#!/bin/bash
set -e

echo "清理旧 proto"
rm -rf ./proto

echo "开始拷贝 proto"
cp -r node_modules/@kodypay/kp-protocols-grpc/src/main/proto .
cp -r node_modules/protobufjs/google ./proto

echo "✅ proto 拷贝完成"

