// 多用户同步功能模块

// 全局变量
let currentUser = null;
let syncInterval = null;
let lastSyncTime = Date.now();
let pendingChanges = [];

// API服务模拟层
const apiService = {
    baseUrl: '/api', // 模拟API基础URL
    
    // 用户认证API
    auth: {
        login: async (credentials) => {
            // 模拟API延迟
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 演示用户数据
            const demoUsers = [
                { id: '1', username: 'admin', password: '123456', name: '系统管理员', role: 'admin' },
                { id: '2', username: 'demo', password: '123456', name: '演示用户', role: 'user' },
                { id: '3', username: 'user1', password: '123456', name: '用户一', role: 'user' }
            ];
            
            const user = demoUsers.find(u => u.username === credentials.username && u.password === credentials.password);
            
            if (user) {
                return {
                    success: true,
                    data: {
                        user: {
                            id: user.id,
                            username: user.username,
                            name: user.name,
                            role: user.role
                        },
                        token: generateJWT(user),
                        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                    }
                };
            } else {
                throw new Error('用户名或密码错误');
            }
        },
        
        logout: async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            return { success: true };
        },
        
        getProfile: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            const session = getCurrentSession();
            if (session) {
                return {
                    success: true,
                    data: session.user
                };
            }
            throw new Error('未登录');
        }
    },
    
    // 项目管理API
    projects: {
        getAll: async (filters = {}) => {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 从localStorage获取数据并模拟多用户数据
            let projects = getAllProjects();
            
            // 添加其他用户的模拟数据
            if (Math.random() > 0.5) {
                const otherUsersProjects = generateMockProjects();
                projects = [...projects, ...otherUsersProjects];
            }
            
            // 应用过滤器
            if (filters.companyId) {
                projects = projects.filter(p => p.companyId === filters.companyId);
            }
            if (filters.status) {
                projects = projects.filter(p => {
                    const status = getProjectStatus(p);
                    return status.text === filters.status;
                });
            }
            
            return {
                success: true,
                data: projects,
                total: projects.length
            };
        },
        
        getById: async (id) => {
            await new Promise(resolve => setTimeout(resolve, 200));
            const project = getProjectById(id);
            if (project) {
                return { success: true, data: project };
            }
            throw new Error('项目不存在');
        },
        
        create: async (projectData) => {
            await new Promise(resolve => setTimeout(resolve, 400));
            
            // 添加版本控制和用户信息
            const newProject = {
                ...projectData,
                version: 1,
                createdBy: currentUser?.id || 'system',
                updatedBy: currentUser?.id || 'system',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // 保存到localStorage
            const projects = getAllProjects();
            projects.push(newProject);
            saveProjects(projects);
            
            // 记录变更
            recordChange('create', 'project', newProject.id, newProject);
            
            return { success: true, data: newProject };
        },
        
        update: async (id, projectData, version) => {
            await new Promise(resolve => setTimeout(resolve, 400));
            
            const projects = getAllProjects();
            const existingProject = projects.find(p => p.id === id);
            
            if (!existingProject) {
                throw new Error('项目不存在');
            }
            
            // 乐观锁检查
            if (existingProject.version !== version) {
                throw new Error('数据已被其他用户修改，请刷新后重试');
            }
            
            // 更新项目
            const updatedProject = {
                ...existingProject,
                ...projectData,
                version: existingProject.version + 1,
                updatedBy: currentUser?.id || 'system',
                updatedAt: new Date().toISOString()
            };
            
            const index = projects.findIndex(p => p.id === id);
            projects[index] = updatedProject;
            saveProjects(projects);
            
            // 记录变更
            recordChange('update', 'project', id, updatedProject);
            
            return { success: true, data: updatedProject };
        },
        
        delete: async (id, version) => {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const projects = getAllProjects();
            const project = projects.find(p => p.id === id);
            
            if (!project) {
                throw new Error('项目不存在');
            }
            
            // 乐观锁检查
            if (project.version !== version) {
                throw new Error('数据已被其他用户修改，请刷新后重试');
            }
            
            const filteredProjects = projects.filter(p => p.id !== id);
            saveProjects(filteredProjects);
            
            // 记录变更
            recordChange('delete', 'project', id, null);
            
            return { success: true };
        },
        
        getChanges: async (since) => {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 模拟其他用户的变更
            const changes = [];
            
            // 随机生成一些变更
            if (Math.random() > 0.7) {
                changes.push({
                    id: generateId(),
                    type: 'create',
                    entity: 'project',
                    data: generateMockProject(),
                    timestamp: new Date().toISOString(),
                    user: { id: '4', name: '其他用户' }
                });
            }
            
            if (Math.random() > 0.8) {
                const projects = getAllProjects();
                if (projects.length > 0) {
                    const randomProject = projects[Math.floor(Math.random() * projects.length)];
                    changes.push({
                        id: generateId(),
                        type: 'update',
                        entity: 'project',
                        entityId: randomProject.id,
                        data: { ...randomProject, name: randomProject.name + ' (已更新)' },
                        timestamp: new Date().toISOString(),
                        user: { id: '5', name: '协作用户' }
                    });
                }
            }
            
            return {
                success: true,
                data: changes
            };
        }
    },
    
    // 公司管理API
    companies: {
        getAll: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return {
                success: true,
                data: getAllCompanies()
            };
        },
        
        create: async (companyData) => {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const newCompany = {
                ...companyData,
                version: 1,
                createdBy: currentUser?.id || 'system',
                updatedBy: currentUser?.id || 'system',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            const companies = getAllCompanies();
            companies.push(newCompany);
            saveCompanies(companies);
            
            recordChange('create', 'company', newCompany.id, newCompany);
            
            return { success: true, data: newCompany };
        },
        
        update: async (id, companyData, version) => {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const companies = getAllCompanies();
            const existingCompany = companies.find(c => c.id === id);
            
            if (!existingCompany) {
                throw new Error('公司不存在');
            }
            
            if (existingCompany.version !== version) {
                throw new Error('数据已被其他用户修改，请刷新后重试');
            }
            
            const updatedCompany = {
                ...existingCompany,
                ...companyData,
                version: existingCompany.version + 1,
                updatedBy: currentUser?.id || 'system',
                updatedAt: new Date().toISOString()
            };
            
            const index = companies.findIndex(c => c.id === id);
            companies[index] = updatedCompany;
            saveCompanies(companies);
            
            recordChange('update', 'company', id, updatedCompany);
            
            return { success: true, data: updatedCompany };
        },
        
        delete: async (id, version) => {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const companies = getAllCompanies();
            const company = companies.find(c => c.id === id);
            
            if (!company) {
                throw new Error('公司不存在');
            }
            
            if (company.version !== version) {
                throw new Error('数据已被其他用户修改，请刷新后重试');
            }
            
            const filteredCompanies = companies.filter(c => c.id !== id);
            saveCompanies(filteredCompanies);
            
            recordChange('delete', 'company', id, null);
            
            return { success: true };
        }
    }
};

// 用户会话管理
function getCurrentSession() {
    try {
        const sessionStr = localStorage.getItem('userSession');
        if (sessionStr) {
            const session = JSON.parse(sessionStr);
            const expires = new Date(session.expires);
            
            if (expires > new Date()) {
                currentUser = session.user;
                return session;
            } else {
                // 会话过期
                localStorage.removeItem('userSession');
                currentUser = null;
                return null;
            }
        }
    } catch (error) {
        console.error('Session error:', error);
        localStorage.removeItem('userSession');
        currentUser = null;
    }
    return null;
}

function saveUserSession(sessionData, remember = false) {
    const session = {
        user: sessionData.user,
        token: sessionData.token,
        expires: sessionData.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    localStorage.setItem('userSession', JSON.stringify(session));
    currentUser = session.user;
}

function clearUserSession() {
    localStorage.removeItem('userSession');
    currentUser = null;
}

// JWT令牌生成（模拟）
function generateJWT(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
        sub: user.id,
        username: user.username,
        role: user.role,
        iat: Date.now(),
        exp: Date.now() + 24 * 60 * 60 * 1000
    }));
    const signature = btoa('mock-signature-' + user.id + '-' + Date.now());
    return `${header}.${payload}.${signature}`;
}

// 数据同步管理
function startDataSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // 每30秒同步一次数据
    syncInterval = setInterval(async () => {
        if (currentUser) {
            await syncData();
        }
    }, 30000);
}

function stopDataSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

async function syncData() {
    try {
        const changes = await apiService.projects.getChanges(lastSyncTime);
        
        if (changes.success && changes.data && changes.data.length > 0) {
            // 处理其他用户的变更
            handleRemoteChanges(changes.data);
            lastSyncTime = Date.now();
        }
        
        // 同步本地待处理的变更
        if (pendingChanges.length > 0) {
            await syncPendingChanges();
        }
        
        // 更新同步状态显示
        updateSyncStatus('已同步', 'success');
    } catch (error) {
        console.error('Sync error:', error);
        updateSyncStatus('同步失败', 'error');
    }
}

function handleRemoteChanges(changes) {
    changes.forEach(change => {
        switch (change.type) {
            case 'create':
                if (change.entity === 'project') {
                    addRemoteProject(change.data);
                }
                break;
            case 'update':
                if (change.entity === 'project') {
                    updateRemoteProject(change.entityId, change.data);
                }
                break;
            case 'delete':
                if (change.entity === 'project') {
                    deleteRemoteProject(change.entityId);
                }
                break;
        }
    });
}

function recordChange(type, entity, id, data) {
    pendingChanges.push({
        id: generateId(),
        type,
        entity,
        entityId: id,
        data,
        timestamp: new Date().toISOString(),
        user: currentUser
    });
}

async function syncPendingChanges() {
    const changesToSync = [...pendingChanges];
    pendingChanges = [];
    
    for (const change of changesToSync) {
        try {
            switch (change.type) {
                case 'create':
                    if (change.entity === 'project') {
                        await apiService.projects.create(change.data);
                    }
                    break;
                case 'update':
                    if (change.entity === 'project') {
                        await apiService.projects.update(change.entityId, change.data, change.data.version);
                    }
                    break;
                case 'delete':
                    if (change.entity === 'project') {
                        await apiService.projects.delete(change.entityId, change.data?.version || 1);
                    }
                    break;
            }
        } catch (error) {
            console.error('Sync change error:', error);
            // 如果同步失败，将变更重新加入待处理列表
            pendingChanges.push(change);
        }
    }
}

// 远程数据处理
function addRemoteProject(projectData) {
    const projects = getAllProjects();
    const exists = projects.find(p => p.id === projectData.id);
    
    if (!exists) {
        projects.push(projectData);
        saveProjects(projects);
        
        // 显示通知
        showSyncNotification(`其他用户添加了新项目: ${projectData.name}`);
        
        // 如果在项目页面，刷新列表
        if (window.location.pathname.includes('projects.html')) {
            loadProjects();
        }
    }
}

function updateRemoteProject(projectId, projectData) {
    const projects = getAllProjects();
    const index = projects.findIndex(p => p.id === projectId);
    
    if (index !== -1) {
        const oldProject = projects[index];
        projects[index] = projectData;
        saveProjects(projects);
        
        // 显示通知
        showSyncNotification(`其他用户更新了项目: ${projectData.name}`);
        
        // 如果在项目页面，刷新列表
        if (window.location.pathname.includes('projects.html')) {
            loadProjects();
        }
    }
}

function deleteRemoteProject(projectId) {
    const projects = getAllProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
        const filteredProjects = projects.filter(p => p.id !== projectId);
        saveProjects(filteredProjects);
        
        // 显示通知
        showSyncNotification(`其他用户删除了项目: ${project.name}`);
        
        // 如果在项目页面，刷新列表
        if (window.location.pathname.includes('projects.html')) {
            loadProjects();
        }
    }
}

// 同步状态UI
function updateSyncStatus(message, type = 'info') {
    const statusElement = document.getElementById('syncStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `text-sm ${type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-600' : 'text-blue-600'}`;
    }
}

function showSyncNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md shadow-lg z-50 toast';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fa fa-refresh fa-spin mr-3 text-blue-500"></i>
            <div>
                <p class="font-medium">数据同步</p>
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

// 工具函数
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateMockProjects() {
    const mockProjects = [];
    const companyNames = ['阿里巴巴', '腾讯科技', '百度网络', '字节跳动', '美团科技'];
    
    for (let i = 0; i < 3; i++) {
        const companyId = 'mock-' + (i + 1);
        const totalAmount = Math.floor(Math.random() * 1000000) + 100000;
        const warrantyRate = 5;
        
        mockProjects.push({
            id: 'mock-proj-' + Date.now() + '-' + i,
            name: `${companyNames[i]}项目${i + 1}`,
            companyId: companyId,
            clientManager: '张经理',
            contractorManager: '李工',
            startTime: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endTime: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            warrantyEndTime: new Date(Date.now() + (Math.random() * 365 + 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            totalAmount: totalAmount,
            warrantyRate: warrantyRate,
            paidAmount: Math.floor(totalAmount * (Math.random() * 0.5 + 0.3)),
            invoicedAmount: Math.floor(totalAmount * (Math.random() * 0.5 + 0.3)),
            warrantyClaimed: Math.random() > 0.5 ? '已申请' : '未申请',
            remarks: '其他用户创建的项目',
            warrantyAmount: calculateWarrantyAmount(totalAmount, warrantyRate),
            settlementAmount: totalAmount - calculateWarrantyAmount(totalAmount, warrantyRate),
            remainingAmount: totalAmount - Math.floor(totalAmount * (Math.random() * 0.5 + 0.3)),
            completionRate: Math.random() * 70 + 30,
            version: 1,
            createdBy: 'mock-user-' + (i + 1),
            updatedBy: 'mock-user-' + (i + 1),
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    return mockProjects;
}

function generateMockProject() {
    const companyNames = ['阿里巴巴', '腾讯科技', '百度网络', '字节跳动', '美团科技'];
    const i = Math.floor(Math.random() * companyNames.length);
    
    const totalAmount = Math.floor(Math.random() * 1000000) + 100000;
    const warrantyRate = 5;
    
    return {
        id: 'mock-proj-' + Date.now(),
        name: `${companyNames[i]}新项目`,
        companyId: 'mock-' + (i + 1),
        clientManager: '王经理',
        contractorManager: '赵工',
        startTime: new Date().toISOString().split('T')[0],
        endTime: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        warrantyEndTime: new Date(Date.now() + 545 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalAmount: totalAmount,
        warrantyRate: warrantyRate,
        paidAmount: 0,
        invoicedAmount: 0,
        warrantyClaimed: '未申请',
        remarks: '新创建的项目',
        warrantyAmount: calculateWarrantyAmount(totalAmount, warrantyRate),
        settlementAmount: totalAmount - calculateWarrantyAmount(totalAmount, warrantyRate),
        remainingAmount: totalAmount,
        completionRate: 0,
        version: 1,
        createdBy: 'other-user',
        updatedBy: 'other-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// 初始化多用户功能
async function initializeMultiUser() {
    // 检查登录状态
    const session = getCurrentSession();
    
    if (!session && !window.location.pathname.includes('login.html')) {
        // 未登录且不在登录页，跳转到登录页
        window.location.href = 'login.html';
        return;
    }
    
    if (session) {
        // 已登录，启动数据同步
        startDataSync();
        
        // 添加同步状态指示器
        addSyncStatusIndicator();
        
        // 初始化网络同步
        await initializeNetworkSync(session);
    }
    
    // 添加页面离开确认
    window.addEventListener('beforeunload', function(e) {
        if (pendingChanges.length > 0 || (networkSync && networkSync.pendingChanges.length > 0)) {
            e.preventDefault();
            e.returnValue = '您有未同步的数据，确定要离开吗？';
            return e.returnValue;
        }
    });
}

// 初始化网络同步
async function initializeNetworkSync(session) {
    try {
        // 等待networkSync加载完成
        if (typeof networkSync === 'undefined') {
            console.warn('网络同步模块尚未加载');
            return;
        }
        
        // 连接到WebSocket服务器
        await networkSync.connect(session.user.id, session.token);
        
        console.log('网络同步初始化成功');
        
        // 添加网络同步状态到UI
        addNetworkSyncStatus();
        
    } catch (error) {
        console.error('网络同步初始化失败:', error);
        showNetworkSyncNotification('网络同步连接失败，将使用本地同步模式', 'warning');
    }
}

// 添加网络同步状态指示器
function addNetworkSyncStatus() {
    const header = document.querySelector('header');
    if (header) {
        const syncDiv = document.getElementById('syncStatusDiv');
        if (syncDiv) {
            // 添加网络同步状态
            const networkStatus = document.createElement('div');
            networkStatus.className = 'flex items-center mr-4';
            networkStatus.innerHTML = `
                <i class="fa fa-globe mr-2 text-green-500" id="networkIcon"></i>
                <span id="networkStatus" class="text-sm text-green-600">网络已连接</span>
            `;
            
            syncDiv.insertBefore(networkStatus, syncDiv.firstChild);
        }
    }
}

// 显示网络同步通知
function showNetworkSyncNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        'info': 'bg-blue-50 border-blue-200 text-blue-800',
        'warning': 'bg-yellow-50 border-yellow-200 text-yellow-800',
        'error': 'bg-red-50 border-red-200 text-red-800',
        'success': 'bg-green-50 border-green-200 text-green-800'
    };
    
    notification.className = `fixed top-4 right-4 ${colors[type] || colors.info} px-4 py-3 rounded-md shadow-lg z-50 toast`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fa fa-cloud mr-3 text-${type === 'info' ? 'blue' : type === 'warning' ? 'yellow' : type === 'error' ? 'red' : 'green'}-500"></i>
            <div>
                <p class="font-medium">网络同步</p>
                <p class="text-sm">${message}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-${type === 'info' ? 'blue' : type === 'warning' ? 'yellow' : type === 'error' ? 'red' : 'green'}-400 hover:text-${type === 'info' ? 'blue' : type === 'warning' ? 'yellow' : type === 'error' ? 'red' : 'green'}-600">
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

function addSyncStatusIndicator() {
    const header = document.querySelector('header');
    if (header) {
        const syncDiv = document.createElement('div');
        syncDiv.className = 'flex items-center ml-auto';
        syncDiv.innerHTML = `
            <div class="flex items-center mr-4">
                <i class="fa fa-refresh fa-spin mr-2 text-blue-500" id="syncIcon"></i>
                <span id="syncStatus" class="text-sm text-blue-600">已同步</span>
            </div>
            <div class="flex items-center mr-4">
                <i class="fa fa-user mr-2 text-gray-500"></i>
                <span class="text-sm font-medium" id="currentUserName">${currentUser?.name || '未知用户'}</span>
            </div>
            <button id="logoutBtn" class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-150">
                退出
            </button>
        `;
        
        header.appendChild(syncDiv);
        
        // 绑定退出按钮事件
        document.getElementById('logoutBtn').addEventListener('click', async function() {
            if (confirm('确定要退出登录吗？')) {
                try {
                    await apiService.auth.logout();
                    clearUserSession();
                    stopDataSync();
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Logout error:', error);
                    clearUserSession();
                    stopDataSync();
                    window.location.href = 'login.html';
                }
            }
        });
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMultiUser);
} else {
    initializeMultiUser();
}