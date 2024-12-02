
let localConnection;
let sendChannel;
const offerTextarea = document.getElementById('offer');
const answerTextarea = document.getElementById('answer');
const chat = document.getElementById('chat');
const connectionStatus = document.getElementById('connectionStatus');
const hostNameInput = document.getElementById('hostName');
const messageInput = document.getElementById('message');
let peerName = 'Peer';

const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'light';

// Apply saved theme
document.documentElement.setAttribute('data-theme', currentTheme);
themeToggle.checked = currentTheme === 'dark';

themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

function sanitizeHTML(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

function safeDecode(base64String) {
    try {
        return atob(base64String);
    } catch (e) {
        alert('Invalid data provided.');
        throw e;
    }
}

function safeEncode(json) {
    return btoa(JSON.stringify(json));
}

async function startHost() {
    const hostName = sanitizeHTML(hostNameInput.value.trim());
    if (!hostName) {
        hostName = "Host"
        return;
    }

    const config = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    localConnection = new RTCPeerConnection(config);

    sendChannel = localConnection.createDataChannel('sendChannel');
    sendChannel.onopen = () => {
        connectionStatus.textContent = `Connected to ${peerName}`;
        sendChannel.send(`NAME:${hostName}`);
        offerTextarea.style.display = 'none';
        answerTextarea.style.display = 'none';
    };

    sendChannel.onmessage = (event) => {
        const sanitizedData = sanitizeHTML(event.data);
        if (sanitizedData.startsWith('NAME:')) {
            peerName = sanitizedData.substring(5);
            connectionStatus.textContent = `Connected to ${peerName}`;
        } else {
            chat.innerHTML += `<p>${peerName}: ${sanitizedData}</p>`;
        }
    };

    sendChannel.onclose = () => {
        connectionStatus.textContent = "Disconnected from Peer";
    };

    localConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            offerTextarea.value = safeEncode(localConnection.localDescription);
        }
    };

    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);
    offerTextarea.value = safeEncode(offer);
}

async function acceptAnswer() {
    const answerBase64 = answerTextarea.value.trim();
    if (!answerBase64) {
        alert('Please paste a valid answer');
        return;
    }

    const answer = JSON.parse(safeDecode(answerBase64));
    await localConnection.setRemoteDescription(answer);
}

function sendMessage() {
    if (sendChannel.readyState === 'open') {
        const message = sanitizeHTML(messageInput.value.trim());
        if (message) {
            chat.innerHTML += `<p>${sanitizeHTML(hostNameInput.value)}: ${message}</p>`;
            sendChannel.send(message);
        }
    } else {
        console.error('Data channel is not open');
    }
}