function getBackendURL() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isLocalFile = protocol === 'file:';
    const isLocalIP = /^192\.168\./.test(hostname) || 
                      /^10\./.test(hostname) || 
                      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
                      /^127\./.test(hostname);

    if (isLocalhost || isLocalFile || isLocalIP) {
        return 'http://localhost:5001';
    }
    
    return 'https://chatbot-gemini-81dj.onrender.com';
}

const URL_BACKEND = getBackendURL();

document.addEventListener('DOMContentLoaded', () => {
    let socket = null;

    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const connectionStatus = document.getElementById('connection-status');
    const iniciarBtn = document.getElementById('iniciarBtn');
    const encerrarBtn = document.getElementById('encerrarBtn');
    const limparBtn = document.getElementById('limparBtn');
    const serverSelect = document.getElementById('serverSelect');

    if (serverSelect) {
        serverSelect.value = URL_BACKEND === 'http://localhost:5001' ? 'local' : 'production';
    }

    function addMessageToChat(sender, text, type = 'normal') {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message-row');

        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender.toLowerCase() === 'user') {
            messageWrapper.classList.add('user-row');
            messageElement.classList.add('user-message');
        } else if (sender.toLowerCase() === 'bot') {
            messageWrapper.classList.add('bot-row');
            messageElement.classList.add('bot-message');
        } else {
            messageWrapper.classList.add('status-row');
            messageElement.classList.add('status-message');
        }

        if (type === 'error') messageElement.classList.add('error-text');
        if (type === 'status') messageElement.classList.add('status-text');

        const textSpan = document.createElement('div');
        textSpan.classList.add('message-content');
        
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);
        messageWrapper.appendChild(messageElement);
        chatBox.appendChild(messageWrapper);
        
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth'
        });
    }

    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    setChatEnabled(false);
    connectionStatus.textContent = 'Desconectado';
    connectionStatus.className = 'status-offline';
    addMessageToChat('Status', 'Clique em "Iniciar conversa" para começar.', 'status');

    function iniciarConversa() {
        if (socket && socket.connected) return;

        const targetURL = serverSelect ? (serverSelect.value === 'local' ? 'http://localhost:5001' : 'https://chatbot-gemini-1-ja4k.onrender.com') : URL_BACKEND;

        addMessageToChat('Status', `Tentando conectar a ${targetURL}...`, 'status');

        socket = io(targetURL, {
            transports: ["websocket", "polling"],
            timeout: 30000,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000
        });

        socket.on("connect_error", (err) => {
            console.error("Erro de conexão:", err);
            addMessageToChat('Erro', `Não foi possível conectar ao servidor. Certifique-se de que o backend está rodando.`, 'error');
            connectionStatus.textContent = 'Erro de Conexão';
            connectionStatus.className = 'status-offline';
            setChatEnabled(false);
        });

        socket.on('connect', () => {
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            addMessageToChat('Status', 'Conectado ao servidor de chat com sucesso!', 'status');
            setChatEnabled(true);
        });

        socket.on('disconnect', () => {
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            addMessageToChat('Status', 'Você foi desconectado do servidor.', 'status');
            setChatEnabled(false);
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            addMessageToChat('Erro', data.erro, 'error');
        });
    }

    function encerrarConversa() {
        if (socket && socket.connected) {
            socket.disconnect();
            setChatEnabled(false);
            addMessageToChat('Status', 'Conversa encerrada pelo usuário.', 'status');
        }
    }

    function limparTela() {
        chatBox.innerHTML = ''; 
        addMessageToChat('Status', 'Tela limpa.', 'status');
    }

    function sendMessageToServer() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        if (socket && socket.connected) {
            addMessageToChat('user', messageText);
            socket.emit('enviar_mensagem', { mensagem: messageText });
            messageInput.value = '';
            messageInput.focus();
        } else {
            addMessageToChat('Erro', 'Não conectado ao servidor.', 'error');
        }
    }

    iniciarBtn.addEventListener('click', iniciarConversa);
    encerrarBtn.addEventListener('click', encerrarConversa);
    limparBtn.addEventListener('click', limparTela);
    sendButton.addEventListener('click', sendMessageToServer);

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessageToServer();
        }
    });
});