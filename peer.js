let localConnection;
let receiveChannel;
const offerTextarea = document.getElementById('offer');
const answerTextarea = document.getElementById('answer');
const chat = document.getElementById('chat');
const connectionStatus = document.getElementById('connectionStatus');
const peerNameInput = document.getElementById('peerName');
const messageInput = document.getElementById('message');
let hostName = 'Host';


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

async function acceptOffer() {
    const peerName = sanitizeHTML(peerNameInput.value.trim());
    if (!peerName) {
        alert('Please enter your name');
        return;
    }

    const offerBase64 = offerTextarea.value.trim();
    if (!offerBase64) {
        alert('Please paste a valid offer');
        return;
    }

    const offer = JSON.parse(safeDecode(offerBase64));
    const config = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    localConnection = new RTCPeerConnection(config);

    localConnection.ondatachannel = (event) => {
        receiveChannel = event.channel;

        receiveChannel.onopen = () => {
            connectionStatus.textContent = `Connected to ${hostName}`;
            receiveChannel.send(`NAME:${peerName}`);
            offerTextarea.style.display = 'none';
            answerTextarea.style.display = 'none';
        };

        receiveChannel.onmessage = (event) => {
            const sanitizedData = sanitizeHTML(event.data);
            if (sanitizedData.startsWith('NAME:')) {
                hostName = sanitizedData.substring(5);
                connectionStatus.textContent = `Connected to ${hostName}`;
                document.title = `Chat with ${peerName}`;
            } else {
                chat.innerHTML += `<p>${hostName}: ${sanitizedData}</p>`;
                chat.scrollTop = chat.scrollHeight;
            }
        };

        receiveChannel.onclose = () => {
            connectionStatus.textContent = "Disconnected from Host";
        };
    };

    localConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            answerTextarea.value = safeEncode(localConnection.localDescription);
        }
    };

    await localConnection.setRemoteDescription(offer);
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    answerTextarea.value = safeEncode(answer);
}

function sendMessage() {
    if (receiveChannel && receiveChannel.readyState === 'open') {
        const message = sanitizeHTML(messageInput.value.trim());
        if (message) {
            chat.innerHTML += `<p>${sanitizeHTML(peerNameInput.value)}: ${message}</p>`;
            receiveChannel.send(message);
            messageInput.value = '';
        }
    } else {
        console.error('Data channel is not open');
    }
}