import { useState, useEffect, useRef } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import Peer from "simple-peer";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [editorValue, setEditorValue] = useState("");
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const editorRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;
      });

    socket.on("me", (id) => {
      setMe(id);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });
    editorRef.current.addEventListener("keyup", (evt) => {
      const text = editorRef.current.value;
      socket.send(text);
    });
    socket.on("message", (data) => {
      setEditorValue(data);
      editorRef.current.value = data;
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <>
      <h1 style={{ textAlign: "center" }}>Video Chat</h1>
      <div>
        <div style={{ display: "flex", width: "90%" }}>
          <div style={{ width: "auto" }}>
            <video playsInline muted ref={myVideo} autoPlay />
          </div>
          <div style={{ width: "auto" }}>
            {callAccepted && !callEnded ? (
              <video playsInline ref={userVideo} autoPlay />
            ) : null}
          </div>
        </div>
        <input
          type="text"
          label="editor"
          value={editorValue}
          ref={editorRef}
          onChange={(e) => setEditorValue(e.target.value)}
        />
        <div>
          <input
            type="text"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
            <button>Copy ID </button>
          </CopyToClipboard>
          <input
            label="ID to call"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div>
            {callAccepted && !callEnded ? (
              <button onClick={leaveCall}>End call</button>
            ) : (
              <button onClick={() => callUser(idToCall)}>Call user</button>
            )}
            {idToCall}
          </div>
          <div>
            {receivingCall && !callAccepted ? (
              <div>
                <h1>{name} is calling...</h1>
                <button onClick={answerCall}>Answer call</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
