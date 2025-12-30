// SSE同步功能模块
// 实现基于Server-Sent Events的单向数据同步

class SSESyncManager {
    constructor() {
        this.eventSource = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.pendingChanges = [];
        this.localDB = null;
        this.currentUser = null;
        this.serverUrl = 'https://your-sse-server.com/events'; // SSE服务器地址
        this.httpServerUrl = 'https://your-http-server.com/api'; // HTTP API服务器地址
        
        // 初始化IndexedDB
        this.initIndexedDB();
    }

    // 初始化IndexedDB
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ProjectManagementSystem', 1);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建项目存储
                if (!db.objectStoreNames.contains('projects')) {
                    const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                    projectStore.createIndex('by_company', 'companyId', { unique: false });
                    projectStore.createIndex('by_status', 'status', { unique: false });
                }
                
                // 创建公司存储
                if (!db.objectStoreNames.contains('companies')) {
                    const companyStore = db.createObjectStore('companies', { keyPath: 'id' });
                    companyStore.createIndex('by_name', 'name', { unique: false });
                }
                
                // 创建同步日志存储
                if (!db.objectStoreNames.contains('sync_logs')) {
                    const logStore = db.createObjectStore('sync_logs', { keyPath: 'id', autoIncrement: true });
                    logStore.createIndex('by_timestamp', 'timestamp', { unique: false });
                    logStore.createIndex('by_status', 'status', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.localDB = event.target.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('IndexedDB initialization error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // 连接到SSE服务器
    connect(userId, token) {
        return new Promise((resolve, reject) => {
            try {
                this.currentUser = userId;
                
                // 关闭现有连接
                if (this.eventSource) {
                    this.eventSource.close();
                }
                
                // 创建新的SSE连接
                this.eventSource = new EventSource(`${this.serverUrl}?user=${userId}&token=${token}`, {
                    withCredentials: true
                });
                
                this.eventSource.onopen = () => {
                    console.log('SSE连接已建立');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };
                
                this.eventSource.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.eventSource.addEventListener('data_change', (event) => {
                    this.handleDataChange(JSON.parse(event.data));
                });
                
                this.eventSource.addEventListener('sync_response', (event) => {
                    this.handleSyncResponse(JSON.parse(event.data));
                });
                
                this.eventSource.onerror = (error) => {
                    console.error('SSE错误:', error);
                    this.isConnected = false;
                    if (this.eventSource.readyState === EventSource.CLOSED) {
                        this.scheduleReconnect();
                    }
                    reject(error);
                };
                
            } catch (error) {
                console.error('SSE连接失败:', error);
                this.isConnected = false;
                this.scheduleReconnect();
                reject(error);
            }
        });
    }

    // 断开连接
    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        this.isConnected = false;
    }

    // 处理接收到的消息
    async handleMessage(message) {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'sync_request':
                    await this.handleSyncRequest(data);
                    break;
                    
                case 'heartbeat':
                    this.sendHeartbeat();
                    break;
                    
                default:
                    console.log('未知消息类型:', data.type);
            }
        } catch (error) {
            console.error('处理消息错误:', error);
        }
    }

    // 处理同步请求
    async handleSyncRequest(request) {
        try {
            const lastSyncTime = request.lastSyncTime || 0;
            
            // 获取上次同步后的本地变更
            const changes = await this.getLocalChanges(lastSyncTime);
            
            // 通过HTTP POST发送同步响应
            await this.sendHttpRequest('/sync-response', {
                requestId: request.id,
                changes: changes,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('处理同步请求错误:', error);
        }
    }

    // 处理同步响应
    async handleSyncResponse(response) {
        try {
            if (response.changes && response.changes.length > 0) {
                // 应用远程变更
                await this.applyRemoteChanges(response.changes);
                
                // 更新同步状态
                await this.updateSyncStatus({
                    lastSyncTime: response.timestamp,
                    success: true,
                    changesApplied: response.changes.length
                });
                
                // 显示同步通知
                this.showSyncNotification(`已同步 ${response.changes.length} 条远程变更`);
            }
        } catch (error) {
            console.error('处理同步响应错误:', error);
        }
    }

    // 处理数据变更通知
    async handleDataChange(change) {
        try {
            // 应用单个数据变更
            await this.applyRemoteChange(change);
            
            // 显示变更通知
            const entityName = change.entity === 'project' ? '项目' : '公司';
            const actionText = {
                'create': '创建了',
                'update': '更新了',
                'delete': '删除了'
            }[change.type] || '修改了';
            
            this.showSyncNotification(`其他用户${actionText}${entityName}: ${change.data?.name || change.entityId}`);
            
        } catch (error) {
            console.error('处理数据变更错误:', error);
        }
    }

    // 发送HTTP请求
    async sendHttpRequest(endpoint, data) {
        const response = await fetch(`${this.httpServerUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP请求失败: ${response.status}`);
        }
        
        return response.json();
    }

    // 获取本地变更
    async getLocalChanges(sinceTime) {
        return new Promise((resolve, reject) => {
            const changes = [];
            const transaction = this.localDB.transaction(['sync_logs'], 'readonly');
            const store = transaction.objectStore('sync_logs');
            const index = store.index('by_timestamp');
            const request = index.openCursor(IDBKeyRange.lowerBound(sinceTime));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.status === 'pending') {
                        changes.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(changes);
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 应用远程变更
    async applyRemoteChanges(changes) {
        for (const change of changes) {
            await this.applyRemoteChange(change);
        }
    }

    // 应用单个远程变更
    async applyRemoteChange(change) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.localDB.transaction([change.entity + 's'], 'readwrite');
                const store = transaction.objectStore(change.entity + 's');
                
                switch (change.type) {
                    case 'create':
                        store.add(change.data).onsuccess = () => resolve();
                        break;
                        
                    case 'update':
                        store.put(change.data).onsuccess = () => resolve();
                        break;
                        
                    case 'delete':
                        store.delete(change.entityId).onsuccess = () => resolve();
                        break;
                        
                    default:
                        resolve();
                }
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = (event) => reject(event.target.error);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // 记录本地变更
    async recordLocalChange(type, entity, data) {
        return new Promise((resolve, reject) => {
            try {
                const change = {
                    id: this.generateId(),
                    type: type,
                    entity: entity,
                    entityId: data.id,
                    data: data,
                    timestamp: Date.now(),
                    userId: this.currentUser,
                    status: 'pending'
                };
                
                const transaction = this.localDB.transaction(['sync_logs'], 'readwrite');
                const store = transaction.objectStore('sync_logs');
                store.add(change);
                
                transaction.oncomplete = () => {
                    this.pendingChanges.push(change);
                    resolve(change);
                };
                
                transaction.onerror = (event) => {
                    reject(event.target.error);
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }

    // 更新同步状态
    async updateSyncStatus(status) {
        localStorage.setItem('sync_status', JSON.stringify(status));
    }

    // 获取同步状态
    getSyncStatus() {
        const status = localStorage.getItem('sync_status');
        return status ? JSON.parse(status) : {
            lastSyncTime: 0,
            success: false,
            changesApplied: 0
        };
    }

    // 同步数据
    async syncData() {
        if (!this.isConnected) {
            return;
        }
        
        try {
            const syncStatus = this.getSyncStatus();
            
            // 通过HTTP POST发送同步请求
            await this.sendHttpRequest('/sync-request', {
                id: this.generateId(),
                lastSyncTime: syncStatus.lastSyncTime,
                timestamp: Date.now()
            });
            
            // 同步待处理的本地变更
            if (this.pendingChanges.length > 0) {
                await this.syncPendingChanges();
            }
            
        } catch (error) {
            console.error('数据同步错误:', error);
        }
    }

    // 同步待处理的变更
    async syncPendingChanges() {
        if (!this.isConnected || this.pendingChanges.length === 0) {
            return;
        }
        
        const changesToSync = [...this.pendingChanges];
        this.pendingChanges = [];
        
        for (const change of changesToSync) {
            try {
                // 通过HTTP POST发送变更
                await this.sendHttpRequest('/data-change', {
                    change: change
                });
                
                // 更新变更状态
                await this.updateChangeStatus(change.id, 'synced');
                
            } catch (error) {
                console.error('同步变更错误:', error);
                // 如果同步失败，将变更重新加入待处理列表
                this.pendingChanges.push(change);
            }
        }
    }

    // 更新变更状态
    async updateChangeStatus(changeId, status) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDB.transaction(['sync_logs'], 'readwrite');
            const store = transaction.objectStore('sync_logs');
            const request = store.get(changeId);
            
            request.onsuccess = (event) => {
                const change = event.target.result;
                if (change) {
                    change.status = status;
                    store.put(change);
                }
            };
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event) => reject(event.target.error);
        });
    }

    // 发送心跳
    async sendHeartbeat() {
        try {
            await this.sendHttpRequest('/heartbeat', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('发送心跳错误:', error);
        }
    }

    // 安排重连
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('达到最大重连次数，停止重连');
            return;
        }
        
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
        
        setTimeout(() => {
            console.log(`尝试重新连接... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            this.reconnectAttempts++;
            
            // 尝试重新连接
            if (this.currentUser) {
                this.connect(this.currentUser, localStorage.getItem('auth_token')).catch(() => {
                    // 连接失败，继续重连
                });
            }
        }, delay);
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 显示同步通知
    showSyncNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md shadow-lg z-50 toast';
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fa fa-cloud-download mr-3 text-blue-500"></i>
                <div>
                    <p class="font-medium">网络同步</p>
                    <p class="text-sm">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-blue-400 hover:text-blue-600">
                    <i class="fa fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // 5秒后自动关闭
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// 导出SSE同步管理器实例
const sseSync = new SSESyncManager();