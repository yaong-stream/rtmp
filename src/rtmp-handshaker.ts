import Crypto from "node:crypto";
import EventEmitter from "node:events";
import {
  RTMP_HANDSHAKE_SIZE,
} from "./constant";

export class RtmpHandShaker extends EventEmitter {
  private handshakeState: RTMPHandshakeDiagram = RTMPHandshakeDiagram.UNINITIALIZED;
  private s1?: Buffer;
  private c1?: Buffer;

  constructor() {
    super();
    this.on("data", this.onData.bind(this));
  }

  private onData(data: Buffer) {
    let pointer = 0;
    switch (this.handshakeState) {
      case RTMPHandshakeDiagram.UNINITIALIZED: {
        if (data.length !== RTMP_HANDSHAKE_SIZE + 1) {
          throw new Error("Handshake size error");
        }
        const c0 = data[0];
        this.emit("client_version", c0);
        pointer += 1;

        this.c1 = data.subarray(pointer, data.length);
        pointer += this.c1.length;

        const s0 = Buffer.alloc(1, 0x03);
        this.emit("response", s0);

        const serverTimestamp = Buffer.alloc(4);
        serverTimestamp.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
        this.s1 = Buffer.concat([
          serverTimestamp,
          Buffer.from([0, 0, 0, 0]), // zero value,
          Crypto.randomBytes(RTMP_HANDSHAKE_SIZE - 8),
        ]);
        this.emit("response", this.s1);

        this.handshakeState = RTMPHandshakeDiagram.VERSION_SENT;
        pointer = 0;
        break;
      }
      case RTMPHandshakeDiagram.VERSION_SENT: {
        if (data.length !== RTMP_HANDSHAKE_SIZE) {
          throw new Error("Handshake size error");
        }
        if (this.c1 == null) {
          throw new Error("Handshake error");
        }
        this.emit("response", this.c1);
        this.handshakeState = RTMPHandshakeDiagram.ACK_SENT;
      }
      case RTMPHandshakeDiagram.ACK_SENT: {
        if (this.s1 == null) {
          throw new Error("Handshake error");
        }
        if (!data.equals(this.s1)) {
          throw new Error("Handshake error");
        }
        this.emit("done");
        this.handshakeState = RTMPHandshakeDiagram.DONE;
        break;
      }
    }
  }
}

export enum RTMPHandshakeDiagram {
  UNINITIALIZED = 0,
  VERSION_SENT = 1,
  ACK_SENT = 2,
  DONE = 3,
};
