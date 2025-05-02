const roomId = window.location.pathname.split('/').pop();
document.getElementById('roomId').innerText = roomId;

const socket = new WebSocket('wss://' + window.location.host);
let localStream, remoteStream, peerConnection;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const endCallBtn = document.getElementById('endCallBtn');

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ join: roomId }));
  init();
});

socket.addEventListener('message', async ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.offer) {
    await createPeer();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.send(JSON.stringify({ answer }));
  }
  if (msg.answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer));
  }
  if (msg.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
  }
});

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 7680 },
      height: { ideal: 4320 },
      frameRate: { ideal: 60 }
    },
    audio: true
  });
  localVideo.srcObject = localStream;
  if (!peerConnection) {
    await createPeer();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.send(JSON.stringify({ offer }));
  }
}

async function createPeer() {
  peerConnection = new RTCPeerConnection(config);
  peerConnection.onicecandidate = e => {
    if (e.candidate) {
      socket.send(JSON.stringify({ candidate: e.candidate }));
    }
  };
  peerConnection.ontrack = e => {
    if (!remoteStream) {
      remoteStream = new MediaStream();
      remoteVideo.srcObject = remoteStream;
    }
    remoteStream.addTrack(e.track);
  };
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
}

endCallBtn.onclick = () => {
  if (peerConnection) peerConnection.close();
  if (socket) socket.close();
  localVideo.srcObject.getTracks().forEach(track => track.stop());
  remoteVideo.srcObject = null;
  alert('Call Ended');
};
