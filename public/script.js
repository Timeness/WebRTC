const socket = io();
const room = window.location.pathname.split('/').pop();

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const endCallBtn = document.getElementById('endCallBtn');

let localStream;
let peerConnection;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function init() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: true
  });
  localVideo.srcObject = localStream;

  socket.emit('join', room);
}

socket.on('user-connected', async () => {
  peerConnection = createPeerConnection();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer);
});

socket.on('offer', async offer => {
  peerConnection = createPeerConnection();

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer);
});

socket.on('answer', async answer => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async candidate => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.error('Error adding received ice candidate', e);
  }
});

function createPeerConnection() {
  const pc = new RTCPeerConnection(config);

  pc.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('candidate', event.candidate);
    }
  };

  pc.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  return pc;
}

endCallBtn.addEventListener('click', () => {
  if (peerConnection) {
    peerConnection.close();
  }
  socket.disconnect();
  window.location.href = '/';
});

init();
