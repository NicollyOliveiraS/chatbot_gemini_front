function getBackendURL() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Verifica se estamos rodando em ambiente local (localhost, arquivo local ou rede local)
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

    // Define a seleção padrão com base no ambiente autodetectado
    if (serverSelect) {
        serverSelect.value = URL_BACKEND === 'http://localhost:5001' ? 'local' : 'production';
    }

    let userSessionId = null;

    // Função para adicionar mensagens no chat
    function addMessageToChat(sender, text, type = 'normal') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (sender.toLowerCase() === 'user') {
            messageElement.classList.add('user-message');
            sender = 'Você';
        } else if (sender.toLowerCase() === 'bot') {
            messageElement.classList.add('bot-message');
            sender = 'Bot';
        } else {
            messageElement.classList.add('status-message');
        }

        if (type === 'error') {
            messageElement.classList.add('error-text');
            sender = 'Erro';
        } else if (type === 'status') {
            messageElement.classList.add('status-text');
            sender = 'Status';
        }

        const senderSpan = document.createElement('strong');
        senderSpan.textContent = `${sender}: `;
        messageElement.appendChild(senderSpan);

        const textSpan = document.createElement('span');
        
        // Se for uma mensagem normal (bot ou usuário), renderiza o Markdown
        if (type === 'normal') {
            textSpan.innerHTML = marked.parse(text);
        } else {
            // Se for erro ou status, mantém como texto puro
            textSpan.textContent = text;
        }
        
        messageElement.appendChild(textSpan);

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Função para habilitar/desabilitar o chat
    function setChatEnabled(enabled) {
        messageInput.disabled = !enabled;
        sendButton.disabled = !enabled;
    }

    // Inicialmente desativa o chat
    setChatEnabled(false);
    connectionStatus.textContent = 'Desconectado';
    connectionStatus.className = 'status-offline';
    addMessageToChat('Status', 'Clique em "Iniciar conversa" para começar.', 'status');

    // Função para conectar ao servidor
    function iniciarConversa() {
        if (socket && socket.connected) return;

        const targetURL = serverSelect ? (serverSelect.value === 'local' ? 'http://localhost:5001' : 'https://chatbot-gemini-81dj.onrender.com') : URL_BACKEND;

        addMessageToChat('Status', `Tentando conectar a ${targetURL}...`, 'status');

        socket = io(targetURL, {
            transports: ["websocket", "polling"],
            timeout: 5000 // limite de tempo para conexão
        });

        socket.on("connect_error", (err) => {
            console.error("Erro de conexão:", err);
            addMessageToChat('Erro', `Não foi possível conectar ao servidor em ${targetURL}. Certifique-se de que o servidor Flask (app.py) está rodando e acessível.`, 'error');
            connectionStatus.textContent = 'Erro de Conexão';
            connectionStatus.className = 'status-offline';
            setChatEnabled(false);
        });

        socket.on('connect', () => {
            console.log('Conectado ao servidor Socket.IO! SID:', socket.id);
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'status-online';
            addMessageToChat('Status', 'Conectado ao servidor de chat com sucesso!', 'status');
            setChatEnabled(true);
        });

        socket.on('disconnect', () => {
            console.log('Desconectado do servidor Socket.IO.');
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'status-offline';
            addMessageToChat('Status', 'Você foi desconectado do servidor.', 'status');
            setChatEnabled(false);
        });

        socket.on('status_conexao', (data) => {
            if (data.session_id) {
                userSessionId = data.session_id;
            }
        });

        socket.on('nova_mensagem', (data) => {
            addMessageToChat(data.remetente, data.texto);
        });

        socket.on('erro', (data) => {
            addMessageToChat('Erro', data.erro, 'error');
        });
    }

    // Função para encerrar a conversa
    function encerrarConversa() {
        if (socket && socket.connected) {
            socket.disconnect();
            setChatEnabled(false);
            addMessageToChat('Status', 'Conversa encerrada pelo usuário.', 'status');
        }
    }

    // Função para limpar as mensagens da tela
    function limparTela() {
        chatBox.innerHTML = ''; // Isso apaga todo o HTML de dentro da caixa de chat
        addMessageToChat('Status', 'Tela limpa.', 'status');
    }

    // Enviar mensagem para o servidor
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

    // Eventos dos botões
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

