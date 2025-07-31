export function purifyProto(buffer: any) {
  try {
    const messages = [];
    let offset = 0;

    while (offset + 5 <= buffer.length) {
      const length = new DataView(
        buffer.buffer,
        buffer.byteOffset + offset + 1,
        4
      ).getUint32(0); // Big Endian
      offset += 5;

      if (offset + length > buffer.length) {
        break;
      }

      const message = buffer.slice(offset, offset + length);
      messages.push(message);
      offset += length;
    }

    // 拼接所有二进制消息
    let totalLength = messages.reduce((sum, msg) => sum + msg.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const msg of messages) {
      result.set(msg, pos);
      pos += msg.length;
    }

    // console.log("purify proto >>>>>>>\n", result);
    return result;
  } catch (e) {
    console.error("purify proto error >>>>>>>\n", e);
    // return buffer;
  }
}
