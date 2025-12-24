const {
    addUserToRoom,
    removeUserFromRoom,
    getRoomParticipants,
    getUserByToken,
    getUserBySocketId,
} = require('./rooms');

module.exports = (io) => {
    console.log('🔌 Инициализация Socket.IO для WebRTC...');
    
    io.on('connection', (socket) => {
        console.log('✅ Новое подключение Socket.IO:', socket.id);
        
        // Обработка подключения к комнате
        socket.on('join-room', async (roomId, token) => {
            try {
                console.log(`👤 Пользователь ${socket.id} присоединяется к комнате ${roomId}`);
                
                if (!roomId) {
                    socket.emit('error', { message: 'Room ID is required' });
                    return;
                }

                await addUserToRoom(roomId, { token, micToggle: true, socketId: socket.id });
                socket.join(roomId);

                // Отправляем только подключившемуся пользователю список участников комнаты
                const participants = getRoomParticipants(roomId).map((user) => ({
                    micToggle: user.micToggle,
                    socketId: user.socketId,
                    userData: user.userData
                }));

                socket.emit('created', { roomId, participants });

                // Сообщаем всем остальным в комнате, что новый пользователь присоединился
                const currentUser = getUserBySocketId(socket.id);
                socket.to(roomId).emit('user-connected', { 
                    socketId: socket.id,
                    userData: currentUser?.userData || { username: 'Unknown User' }
                });

                console.log(`✅ Пользователь ${socket.id} успешно присоединился к комнате ${roomId}`);
            } catch (error) {
                console.error('❌ Ошибка при присоединении к комнате:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Обработка сигналов WebRTC
        socket.on('signal', (data) => {
            const { to, type, ...payload } = data;

            if (to) {
                io.to(to).emit('signal', { from: socket.id, type, ...payload });
            }
        });

        // Обработка отключения
        socket.on('disconnect', () => {
            console.log('👋 Пользователь отключился:', socket.id);
            handleDisconnect(socket);
        });

        // Обработка выхода из комнаты
        socket.on('leave-room', (roomId) => {
            console.log(`🚪 Пользователь ${socket.id} покидает комнату ${roomId}`);
            if (roomId) {
                handleDisconnect(socket, roomId);
            }
        });

        function handleDisconnect(socket, roomId = null) {
            // Если roomId не указан, ищем комнату по socketId
            if (!roomId) {
                const userInfo = getUserBySocketId(socket.id);
                if (userInfo) {
                    roomId = userInfo.roomId;
                }
            }

            if (roomId) {
                removeUserFromRoom(roomId, socket.id);
                socket.to(roomId).emit('user-disconnected', socket.id);
                console.log(`✅ Пользователь ${socket.id} удален из комнаты ${roomId}`);
            }
        }

        // socket.on('mute', () => {
        //     toggleMicForUser(socket.id, false); // Устанавливаем micToggle в false
        // });

        // // Обработка события включения микрофона
        // socket.on('unmute', () => {
        //     toggleMicForUser(socket.id, true); // Устанавливаем micToggle в true
        // });
    });
};
