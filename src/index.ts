import Net from "net";
import {
  RTMP_PORT,
} from "./constant";
import {
  RtmpSession,
} from "./rtmp";

const server = Net.createServer((socket) => {
  const session = new RtmpSession(socket);
});

server.listen(RTMP_PORT, () => {
  console.log(`Application started at ${RTMP_PORT}`);
});
