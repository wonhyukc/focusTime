// chrome-api-mock.js
// Mock implementation for Chrome extension APIs when running outside the extension

(function() {
    // Check if we're running in a Chrome extension context
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

    if (!isExtension) {
        // Create chrome namespace if it doesn't exist
        window.chrome = window.chrome || {};

        // Mock chrome.storage
        window.chrome.storage = {
            local: {
                get: function(key, callback) {
                    try {
                        const data = JSON.parse(localStorage.getItem('mock_storage_local') || '{}');
                        if (typeof key === 'string') {
                            const result = {};
                            result[key] = data[key];
                            setTimeout(() => callback(result), 10);
                        } else if (Array.isArray(key)) {
                            const result = {};
                            key.forEach(k => result[k] = data[k]);
                            setTimeout(() => callback(result), 10);
                        } else {
                            setTimeout(() => callback(data), 10);
                        }
                    } catch (error) {
                        setTimeout(() => callback({}), 10);
                    }
                },
                set: function(items, callback) {
                    try {
                        const data = JSON.parse(localStorage.getItem('mock_storage_local') || '{}');
                        Object.assign(data, items);
                        localStorage.setItem('mock_storage_local', JSON.stringify(data));
                        if (callback) setTimeout(callback, 10);
                    } catch (error) {
                        if (callback) setTimeout(callback, 10);
                    }
                }
            },
            sync: {
                get: function(key, callback) {
                    try {
                        const data = JSON.parse(localStorage.getItem('mock_storage_sync') || '{}');
                        if (typeof key === 'string') {
                            const result = {};
                            result[key] = data[key];
                            setTimeout(() => callback(result), 10);
                        } else if (Array.isArray(key)) {
                            const result = {};
                            key.forEach(k => result[k] = data[k]);
                            setTimeout(() => callback(result), 10);
                        } else {
                            setTimeout(() => callback(data), 10);
                        }
                    } catch (error) {
                        setTimeout(() => callback({}), 10);
                    }
                },
                set: function(items, callback) {
                    try {
                        const data = JSON.parse(localStorage.getItem('mock_storage_sync') || '{}');
                        Object.assign(data, items);
                        localStorage.setItem('mock_storage_sync', JSON.stringify(data));
                        if (callback) setTimeout(callback, 10);
                    } catch (error) {
                        if (callback) setTimeout(callback, 10);
                    }
                }
            }
        };

        // Mock chrome.runtime
        window.chrome.runtime = {
            sendMessage: function(message, callback) {
                if (message.action === 'playSound') {
                    // Beep sound implementation
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 800;
                    gainNode.gain.value = 0.1;
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.start();
                    setTimeout(() => oscillator.stop(), 200);
                }
                if (callback) setTimeout(() => callback({}), 10);
            },
            onMessage: {
                addListener: function(listener) {
                    window._mockMessageListeners = window._mockMessageListeners || [];
                    window._mockMessageListeners.push(listener);
                }
            }
        };

        // Helper to dispatch mock messages
        window.dispatchMockMessage = function(message) {
            if (window._mockMessageListeners) {
                window._mockMessageListeners.forEach(listener => {
                    listener(message, {}, function(response) {});
                });
            }
        };

        // Add sample data for testing
        const sampleHistory = [];
        
        // Generate some sample data for the last 30 days
        const now = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            // Random number of sessions (0-5) for each day
            const sessionsCount = Math.floor(Math.random() * 6);
            
            for (let j = 0; j < sessionsCount; j++) {
                date.setHours(Math.floor(Math.random() * 24));
                sampleHistory.push({
                    type: 'focus',
                    startTime: date.toISOString(),
                    durationMinutes: [15, 25, 30, 45, 60][Math.floor(Math.random() * 5)],
                    projectName: '샘플 프로젝트'
                });
            }
        }
        
        // Store sample data in mock storage
        localStorage.setItem('mock_storage_local', JSON.stringify({
            pomodoroHistory: sampleHistory
        }));
    }
})(); 