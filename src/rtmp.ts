import {
  Socket,
} from "net";
import { RTMP_HANDSHAKE_SIZE } from "./constant";

export class RtmpSession {
  private handshakeState: RTMPHandshakeDiagram = RTMPHandshakeDiagram.UNINITIALIZED;
  private clientVersion: number = 0;

  constructor(private socket: Socket) {
    this.socket.on("data", this.onData.bind(this));
    this.socket.on("close", this.onClose.bind(this));
    this.socket.on("error", this.onError.bind(this));
    this.socket.on("timeout", this.onTimeout.bind(this));
  }

  private onData(data: Buffer) {
    let bytes = data.length;
    let pointer = 0;
    switch (this.handshakeState) {
      case RTMPHandshakeDiagram.UNINITIALIZED: {
        if (bytes !== RTMP_HANDSHAKE_SIZE + 1) {
          this.socket.destroy();
          throw new Error("Handshake size error");
        }
        this.clientVersion = data[0];
        pointer += 1;
        const time = data.readUInt32BE(pointer);
        pointer += 4;
        const zero = data.readUint32BE(pointer);
        pointer += 4;
        const dummy = Buffer.alloc(RTMP_HANDSHAKE_SIZE - 8);
        data.copy(dummy, 0, pointer, bytes);
        this.socket.write(Buffer.from([0x03]));
        const s1 = Buffer.alloc(RTMP_HANDSHAKE_SIZE);
        s1.writeUInt32BE(Date.now() / 1000, 0);
        s1.fill(0x00, 4);
        this.socket.write(s1);
        this.handshakeState = RTMPHandshakeDiagram.VERSION_SENT;
        break;
      }
      case RTMPHandshakeDiagram.VERSION_SENT: {
        if (data.length !== RTMP_HANDSHAKE_SIZE) {
          this.socket.destroy();
          throw new Error("Handshake size error");
        }
        this.socket.write(data);
        this.handshakeState = RTMPHandshakeDiagram.ACK_SENT;
      }
      case RTMPHandshakeDiagram.ACK_SENT: {

        console.log(data);
        const time = data.readUInt32BE(pointer);
        pointer += 4;
        const time2 = data.readUInt32BE(pointer);
        pointer += 4;
        const dummy = Buffer.alloc(RTMP_HANDSHAKE_SIZE - 8);
        data.copy(dummy, 0, pointer, data.length);
        pointer = data.length;
        console.log({ time, time2, dummy });
        this.handshakeState = RTMPHandshakeDiagram.DONE;
        break;
      }
      case RTMPHandshakeDiagram.DONE: {

        const { fmt, csid, size } = this.getHeaderType(data);
        pointer += size;
        const { timestamp, messageLength, messageTypeId, messageStreamId, pointer: p } = this.getChunkMessageHeader(fmt, data, pointer);
        pointer = p;
        let extendTimestamp = 0;
        if (timestamp != null && timestamp >= 0xFFFFFF) {
          extendTimestamp = data.readUint32LE(pointer);
          pointer += 4;
        }
        const chunk = Buffer.alloc(bytes - pointer);
        data.copy(chunk, 0, pointer, bytes);
        pointer = bytes;

        console.log({ fmt, csid, timestamp, messageLength, messageTypeId, messageStreamId, extendTimestamp, chunk });
        console.log(data);
        console.log("chunk")
      }




    }

  }

  private getHeaderType(data: Buffer) {
    const fmt: RTMPChunkMessageHeader = (data[0] & 0b11000000) >> 6;
    let csid = data[0] & 0b00111111;
    let size = 1;
    if (fmt === 1) {
      csid = data[1];
      size += 1;
      return { fmt, csid, size };
    } else if (fmt === 2 && csid === 1) {
      csid = data.readUint16LE(1);
      size += 2;
      return { fmt, csid, size };
    }
    return { fmt, csid, size };
  }

  private getChunkMessageHeader(fmt: RTMPChunkMessageHeader, data: Buffer, pointer: number) {
    let timestamp = 0, messageLength = 0, messageTypeId = 0, messageStreamId = 0;
    if (fmt === RTMPChunkMessageHeader.TYPE_3) {
      return { timestamp, messageLength, messageTypeId, messageStreamId, pointer };
    }
    const timestampBuffer = Buffer.alloc(3);
    data.copy(timestampBuffer, 0, pointer, pointer + 3);
    pointer += 3;
    timestamp = timestampBuffer[2] << 16 | timestampBuffer[1] << 8 | timestampBuffer[0];
    if (fmt === RTMPChunkMessageHeader.TYPE_2) {
      return { timestamp, messageLength, messageTypeId, messageStreamId, pointer };
    }
    const messageLengthBuffer = Buffer.alloc(3);
    data.copy(messageLengthBuffer, 0, pointer, pointer + 3);
    pointer += 3;
    messageLength = messageLengthBuffer[2] << 16 | messageLengthBuffer[1] << 8 | messageLengthBuffer[0];
    messageTypeId = data.readUint8(pointer);
    pointer += 1;
    if (fmt === RTMPChunkMessageHeader.TYPE_1) {
      return { timestamp, messageLength, messageTypeId, messageStreamId, pointer };
    }
    messageStreamId = data.readUint32LE(pointer);
    pointer += 4;
    return { timestamp, messageLength, messageTypeId, messageStreamId, pointer };
  }

  private onClose(hadError: boolean) {
    if(hadError){
      // console.error()
    }
    
  }

  private onError(error: Error) {
    console.error(error);
  }

  private onTimeout() {
    console.info("timeout");

  }
}


export enum RTMPHandshakeDiagram {
  UNINITIALIZED = 0,
  VERSION_SENT = 1,
  ACK_SENT = 2,
  DONE = 3,
};

export enum RTMPChunkMessageHeader {
  TYPE_0 = 0,
  TYPE_1 = 1,
  TYPE_2 = 2,
  TYPE_3 = 3,                   // 메시지 해더 없음
};
