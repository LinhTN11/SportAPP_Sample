import { io } from 'socket.io-client';

export const CHAT_SOCKET_URL =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const CHAT_SOCKET_EVENT_ALIASES = {
    newMessage: ['new_message'],
    messageNotification: ['message_notification'],
    joinRoom: ['join_room'],
    leaveRoom: ['leave_room'],
    sendMessage: ['send_message'],
    markRead: ['mark_read'],
};

export function createChatSocket(token) {
    return io(CHAT_SOCKET_URL, { auth: { token } });
}

function bindAliasedEvents(socket, eventNames, handler) {
    if (!socket || !Array.isArray(eventNames) || typeof handler !== 'function') {
        return () => {};
    }

    eventNames.forEach((name) => socket.on(name, handler));
    return () => {
        eventNames.forEach((name) => socket.off(name, handler));
    };
}

function emitAliased(socket, eventNames, payload) {
    if (!socket || !Array.isArray(eventNames)) return;
    eventNames.forEach((name) => socket.emit(name, payload));
}

export function registerChatSocketHandlers(socket, handlers = {}) {
    const cleanups = [];

    if (handlers.onNewMessage) {
        cleanups.push(bindAliasedEvents(socket, CHAT_SOCKET_EVENT_ALIASES.newMessage, handlers.onNewMessage));
    }
    if (handlers.onMessageNotification) {
        cleanups.push(
            bindAliasedEvents(socket, CHAT_SOCKET_EVENT_ALIASES.messageNotification, handlers.onMessageNotification)
        );
    }

    return () => {
        cleanups.forEach((cleanup) => cleanup());
    };
}

export function joinChatRoom(socket, roomId) {
    emitAliased(socket, CHAT_SOCKET_EVENT_ALIASES.joinRoom, roomId);
}

export function leaveChatRoom(socket, roomId) {
    emitAliased(socket, CHAT_SOCKET_EVENT_ALIASES.leaveRoom, roomId);
}

export function sendChatMessage(socket, payload) {
    emitAliased(socket, CHAT_SOCKET_EVENT_ALIASES.sendMessage, payload);
}

export function markChatRoomRead(socket, payload) {
    emitAliased(socket, CHAT_SOCKET_EVENT_ALIASES.markRead, payload);
}
