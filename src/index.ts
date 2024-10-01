import {
    DropArgument,
    Server,
    Socket
} from "net";
import {
    RTMP_PORT,
} from "./constant";

export class RTMP extends Server {
    constructor() {
        super();
        this.on("close", this.onClose.bind(this));
        this.on("connection", this.onConnect.bind(this));
        this.on("drop", this.onDrop.bind(this));
        this.on("error", this.onError.bind(this));
        this.on("listening", this.onListening.bind(this));
    }

    private onClose() {

    }

    private onConnect(data: Socket) {

    }

    private onDrop(data: DropArgument) {

    }

    private onError(error: Error) {

    }

    private onListening() {

    }
}

const server = new RTMP();

server.listen(RTMP_PORT, () => {
    console.log("application started at 1935.");
});
