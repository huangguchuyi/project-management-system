// 网络同步功能模块
// 实现基于WebSocket和IndexedDB的跨网络数据同步

class NetworkSyncManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.syncInterval = null;
        this.pendingChanges = [];
        this.localDB = null;
        this.currentUser = null;
        this.serverUrl = 'wss://socketsbay.com/wss/v2/1/demo/'; // 更稳定的公共WebSocket测试服务器
        // 实际使用时应替换为真实的WebSocket服务器地址
        
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

    // 连接到WebSocket服务器
    connect(userId, token) {
        return new Promise((resolve, reject) => {
            try {
                this.currentUser = userId;
                
                // 关闭现有连接
                if (this.socket) {
                    this.socket.close();
                }
                
                // 创建新的WebSocket连接
                this.socket = new WebSocket(`${this.serverUrl}?user=${userId}&token=${token}`);
                
                this.socket.onopen = () => {
                    console.log('WebSocket连接已建立');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startPeriodicSync();
                    resolve();
                };
                
                this.socket.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.socket.onclose = (event) => {
                    console.log('WebSocket连接已关闭:', event.code, event.reason);
                    this.isConnected = false;
                    this.stopPeriodicSync();
                    this.scheduleReconnect();
                };
                
                this.socket.onerror = (error) => {
                    console.error('WebSocket错误:', error);
                    this.isConnected = false;
                    reject(error);
                };
                
            } catch (error) {
                console.error('WebSocket连接失败:', error);
                this.isConnected = false;
                this.scheduleReconnect();
                reject(error);
            }
        });
    }

    // 断开连接
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
        this.stopPeriodicSync();
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
                    
                case 'sync_response':
                    await this.handleSyncResponse(data);
                    break;
                    
                case 'data_change':
                    await this.handleDataChange(data);
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
            
            // 发送同步响应
            this.send({
                type: 'sync_response',
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

    // 开始定期同步
    startPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // 每30秒同步一次
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 30000);
    }

    // 停止定期同步
    stopPeriodicSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    // 同步数据
    async syncData() {
        if (!this.isConnected) {
            return;
        }
        
        try {
            const syncStatus = this.getSyncStatus();
            
            // 发送同步请求
            this.send({
                type: 'sync_request',
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
                // 发送变更到服务器
                this.send({
                    type: 'data_change',
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

    // 发送消息
    send(message) {
        if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            return true;
        } else {
            console.warn('WebSocket未连接，无法发送消息');
            return false;
        }
    }

    // 发送心跳
    sendHeartbeat() {
        this.send({
            type: 'heartbeat',
            timestamp: Date.now()
        });
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
                this.connect(this.currentUser, '').catch(() => {
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

    // 从IndexedDB加载项目
    async loadProjects() {
        return new Promise((resolve, reject) => {
            const projects = [];
            const transaction = this.localDB.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    projects.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(projects);
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 从IndexedDB加载公司
    async loadCompanies() {
        return new Promise((resolve, reject) => {
            const companies = [];
            const transaction = this.localDB.transaction(['companies'], 'readonly');
            const store = transaction.objectStore('companies');
            const request = store.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    companies.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(companies);
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 保存项目到IndexedDB
    async saveProject(project) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDB.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            const request = store.put(project);
            
            request.onsuccess = async () => {
                // 记录变更
                await this.recordLocalChange('update', 'project', project);
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 创建项目
    async createProject(project) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDB.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            const request = store.add(project);
            
            request.onsuccess = async () => {
                // 记录变更
                await this.recordLocalChange('create', 'project', project);
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 删除项目
    async deleteProject(projectId) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDB.transaction(['projects'], 'readwrite');
            const store = transaction.objectStore('projects');
            const request = store.delete(projectId);
            
            request.onsuccess = async () => {
                // 记录变更
                await this.recordLocalChange('delete', 'project', { id: projectId });
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 保存公司到IndexedDB
    async saveCompany(company) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDB.transaction(['companies'], 'readwrite');
            const store = transaction.objectStore('companies');
            const request = store.put(company);
            
            request.onsuccess = async () => {
                // 记录变更
                await this.recordLocalChange('update', 'company', company);
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 创建公司
    async createCompany(company) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDB.transaction(['companies'], 'readwrite');
            const store = transaction.objectStore('companies');
            const request = store.add(company);
            
            request.onsuccess = async () => {
                // 记录变更
                await this.recordLocalChange('create', 'company', company);
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 删除公司
    async deleteCompany(companyId) {
        return new Promise((resolve, reject) => {
            const transaction = this.localDB.transaction(['companies'], 'readwrite');
            const store = transaction.objectStore('companies');
            const request = store.delete(companyId);
            
            request.onsuccess = async () => {
                // 记录变更
                await this.recordLocalChange('delete', 'company', { id: companyId });
                resolve();
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    // 导出数据（用于备份）
    async exportData() {
        const projects = await this.loadProjects();
        const companies = await this.loadCompanies();
        
        return {
            projects: projects,
            companies: companies,
            exportTime: new Date().toISOString()
        };
    }

    // 导入数据（用于恢复）
    async importData(data) {
        try {
            // 导入项目
            if (data.projects && Array.isArray(data.projects)) {
                for (const project of data.projects) {
                    await this.saveProject(project);
                }
            }
            
            // 导入公司
            if (data.companies && Array.isArray(data.companies)) {
                for (const company of data.companies) {
                    await this.saveCompany(company);
                }
            }
            
            return true;
        } catch (error) {
            console.error('导入数据错误:', error);
            return false;
        }
    }
}

// 创建全局实例
const networkSync = new NetworkSyncManager();

// 工具函数：将localStorage数据迁移到IndexedDB
async function migrateLocalStorageToIndexedDB() {
    try {
        // 检查是否已经迁移过
        const migrated = localStorage.getItem('data_migrated_to_indexeddb');
        if (migrated === 'true') {
            console.log('数据已经迁移到IndexedDB');
            return;
        }
        
        console.log('开始将数据迁移到IndexedDB...');
        
        // 迁移项目数据
        const projectsKey = 'projects';
        const projectsData = localStorage.getItem(projectsKey);
        if (projectsData) {
            const projects = JSON.parse(projectsData);
            for (const project of projects) {
                await networkSync.saveProject(project);
            }
            console.log(`已迁移 ${projects.length} 个项目`);
        }
        
        // 迁移公司数据
        const companiesKey = 'companies';
        const companiesData = localStorage.getItem(companiesKey);
        if (companiesData) {
            const companies = JSON.parse(companiesData);
            for (const company of companies) {
                await networkSync.saveCompany(company);
            }
            console.log(`已迁移 ${companies.length} 个公司`);
        }
        
        // 标记迁移完成
        localStorage.setItem('data_migrated_to_indexeddb', 'true');
        console.log('数据迁移完成');
        
    } catch (error) {
        console.error('数据迁移错误:', error);
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 初始化网络同步
        networkSync.initIndexedDB().then(() => {
            migrateLocalStorageToIndexedDB();
        });
    });
} else {
    networkSync.initIndexedDB().then(() => {
        migrateLocalStorageToIndexedDB();
    });
}