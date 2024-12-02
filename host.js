
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

document.documentElement.setAttribute('data-theme', currentTheme);
themeToggle.checked = currentTheme === 'dark';

themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

document.getElementById('copyOffer').addEventListener('click', () => {
    navigator.clipboard.writeText(offerTextarea.value).catch(err => alert('Failed to copy'));
});

document.getElementById('pasteAnswer').addEventListener('click', async () => {
    try {
        answerTextarea.value = await navigator.clipboard.readText();
    } catch (err) {
        alert('Failed to paste');
    }
});

messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
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
    let hostName = sanitizeHTML(hostNameInput.value.trim());
    if (!hostName) {
        hostName = "Host";
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
            chat.scrollTop = chat.scrollHeight;

        }
    };

    sendChannel.onclose = () => {
        connectionStatus.textContent = "Disconnected from Peer";
    };

    localConnection.onicecandidate = ({ candidate }) => {
        if (!candidate) {
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
            messageInput.value = '';
        }
    } else {
        console.error('Data channel is not open');
    }
}
