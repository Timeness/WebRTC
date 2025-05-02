const roomId = window.location.pathname.split('/').pop();
const socket = new WebSocket('ws://' + window.location.host);

let localStream, remoteStream, peerConnection;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ join: roomId }));
  init();
});

socket.addEventListener('message', async ({ data }) => {
  const message = JSON.parse(data);

  if (message.offer) {
    await createPeer();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.send(JSON.stringify({ answer }));
  }

  if (message.answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
  }

  if (message.candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
  }
});

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
