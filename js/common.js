// 公共函数和数据处理

// 全局缓存对象
const AppCache = {
    projects: null,
    companies: null,
    statistics: null,
    lastUpdated: null,
    cacheExpiry: 5 * 60 * 1000, // 缓存过期时间：5分钟
    
    // 检查缓存是否有效
    isCacheValid() {
        if (!this.lastUpdated) return false;
        return (Date.now() - this.lastUpdated) < this.cacheExpiry;
    },
    
    // 清除缓存
    clearCache() {
        this.projects = null;
        this.companies = null;
        this.statistics = null;
        this.lastUpdated = null;
    },
    
    // 更新缓存时间
    updateTimestamp() {
        this.lastUpdated = Date.now();
    }
};

// 初始化示例数据
function initializeData() {
    // 检查localStorage中是否已有数据
    if (!localStorage.getItem('projects') || !localStorage.getItem('companies')) {
        // 示例公司数据
        const sampleCompanies = [
            {
                id: 'C001',
                name: '北京科技有限公司',
                remarks: '长期合作伙伴，主要负责软件开发项目'
            },
            {
                id: 'C002',
                name: '上海建筑工程公司',
                remarks: '建筑工程类项目合作方'
            },
            {
                id: 'C003',
                name: '广州制造业集团',
                remarks: '制造业自动化改造项目'
            }
        ];

        // 示例项目数据
        const sampleProjects = [
            {
                id: 'P001',
                name: '企业管理系统开发',
                companyId: 'C001',
                startTime: '2023-01-15',
                endTime: '2023-06-30',
                warrantyEndTime: '2024-06-30',
                totalAmount: 1500000.00,
                settlementAmount: 1450000.00,
                warrantyAmount: 75000.00,
                warrantyRate: 5.0,
                paidAmount: 1375000.00,
                remainingAmount: 75000.00,
                invoicedAmount: 1375000.00,
                warrantyClaimed: '未申请',
                completionRate: 91.67,
                remarks: '项目已完成，质保金未到期',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'P002',
                name: '办公楼建设工程',
                companyId: 'C002',
                startTime: '2023-03-01',
                endTime: '2024-02-28',
                warrantyEndTime: '2025-02-28',
                totalAmount: 5000000.00,
                settlementAmount: 4800000.00,
                warrantyAmount: 250000.00,
                warrantyRate: 5.0,
                paidAmount: 4320000.00,
                remainingAmount: 480000.00,
                invoicedAmount: 4000000.00,
                warrantyClaimed: '未申请',
                completionRate: 86.40,
                remarks: '项目进行中，已完成主体结构',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'P003',
                name: '生产线自动化改造',
                companyId: 'C003',
                startTime: '2023-05-10',
                endTime: '2023-11-10',
                warrantyEndTime: '2024-11-10',
                totalAmount: 2000000.00,
                settlementAmount: 1950000.00,
                warrantyAmount: 100000.00,
                warrantyRate: 5.0,
                paidAmount: 1850000.00,
                remainingAmount: 100000.00,
                invoicedAmount: 1850000.00,
                warrantyClaimed: '未申请',
                completionRate: 92.50,
                remarks: '项目已完成，运行良好',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'P004',
                name: '移动应用开发',
                companyId: 'C001',
                startTime: '2023-07-01',
                endTime: '2023-12-31',
                warrantyEndTime: '2024-12-31',
                totalAmount: 800000.00,
                settlementAmount: 780000.00,
                warrantyAmount: 40000.00,
                warrantyRate: 5.0,
                paidAmount: 702000.00,
                remainingAmount: 78000.00,
                invoicedAmount: 700000.00,
                warrantyClaimed: '未申请',
                completionRate: 87.75,
                remarks: '项目进行中，已完成测试版',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'P005',
                name: '数据中心建设',
                companyId: 'C002',
                startTime: '2023-09-01',
                endTime: '2024-03-31',
                warrantyEndTime: '2025-03-31',
                totalAmount: 3500000.00,
                settlementAmount: 3350000.00,
                warrantyAmount: 175000.00,
                warrantyRate: 5.0,
                paidAmount: 1675000.00,
                remainingAmount: 1675000.00,
                invoicedAmount: 1500000.00,
                warrantyClaimed: '未申请',
                completionRate: 48.29,
                remarks: '项目进行中，已完成基础设施',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];

        // 保存示例数据到localStorage
        localStorage.setItem('companies', JSON.stringify(sampleCompanies));
        localStorage.setItem('projects', JSON.stringify(sampleProjects));
        
        // 初始化操作日志
        const initialLog = {
            timestamp: new Date().toISOString(),
            action: '系统初始化',
            details: '创建示例数据'
        };
        localStorage.setItem('operationLogs', JSON.stringify([initialLog]));
        
        // 初始化系统设置
        const settings = {
            darkMode: false,
            notificationsEnabled: true,
            backupFrequency: 'weekly',
            currencySymbol: '¥',
            dateFormat: 'YYYY-MM-DD'
        };
        localStorage.setItem('settings', JSON.stringify(settings));
    }
}

// 获取所有公司数据（带缓存）
function getAllCompanies(forceRefresh = false) {
    if (!forceRefresh && AppCache.companies && AppCache.isCacheValid()) {
        return AppCache.companies;
    }
    
    const companies = JSON.parse(localStorage.getItem('companies') || '[]');
    AppCache.companies = companies;
    AppCache.updateTimestamp();
    return companies;
}

// 获取所有项目数据（带缓存）
function getAllProjects(forceRefresh = false) {
    if (!forceRefresh && AppCache.projects && AppCache.isCacheValid()) {
        return AppCache.projects;
    }
    
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    AppCache.projects = projects;
    AppCache.updateTimestamp();
    return projects;
}

// 保存公司数据
function saveCompanies(companies) {
    localStorage.setItem('companies', JSON.stringify(companies));
    AppCache.companies = companies;
    AppCache.updateTimestamp();
    
    // 记录操作日志
    logOperation('更新公司数据', `更新了 ${companies.length} 家公司信息`);
}

// 保存项目数据
function saveProjects(projects) {
    localStorage.setItem('projects', JSON.stringify(projects));
    AppCache.projects = projects;
    AppCache.statistics = null; // 清除统计缓存
    AppCache.updateTimestamp();
    
    // 记录操作日志
    logOperation('更新项目数据', `更新了 ${projects.length} 个项目信息`);
}

// 记录操作日志
function logOperation(action, details = '') {
    try {
        const logs = JSON.parse(localStorage.getItem('operationLogs') || '[]');
        const newLog = {
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            user: '当前用户' // 实际应用中应该是登录用户
        };
        
        // 限制日志数量，保留最近100条
        logs.unshift(newLog);
        if (logs.length > 100) {
            logs.splice(100);
        }
        
        localStorage.setItem('operationLogs', JSON.stringify(logs));
    } catch (error) {
        console.error('记录操作日志失败:', error);
    }
}

// 获取系统设置
function getSettings() {
    return JSON.parse(localStorage.getItem('settings') || '{}');
}

// 保存系统设置
function saveSettings(settings) {
    localStorage.setItem('settings', JSON.stringify(settings));
    applySettings(settings);
}

// 应用系统设置
function applySettings(settings = null) {
    const currentSettings = settings || getSettings();
    
    // 应用深色模式
    if (currentSettings.darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

// 根据ID获取公司信息
function getCompanyById(id) {
    const companies = getAllCompanies();
    return companies.find(company => company.id === id);
}

// 格式化金额显示
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '¥0';
    
    const settings = getSettings();
    const symbol = settings.currencySymbol || '¥';
    
    return symbol + Number(amount).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// 格式化日期显示
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const settings = getSettings();
    const format = settings.dateFormat || 'YYYY-MM-DD';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day);
}

// 计算项目状态
function getProjectStatus(project) {
    const today = new Date();
    const endDate = new Date(project.endTime);
    const warrantyEndDate = new Date(project.warrantyEndTime);
    
    if (today > warrantyEndDate) {
        return { text: '已完成', class: 'text-success' };
    } else if (today > endDate) {
        return { text: '质保期', class: 'text-warning' };
    } else {
        return { text: '进行中', class: 'text-primary' };
    }
}

// 计算项目完成率
function calculateCompletionRate(paidAmount, totalAmount) {
    if (!totalAmount) return 0;
    return ((paidAmount / totalAmount) * 100).toFixed(2);
}

// 计算质保金额
function calculateWarrantyAmount(totalAmount, warrantyRate) {
    return (totalAmount * warrantyRate / 100).toFixed(2);
}

// 计算剩余金额
function calculateRemainingAmount(totalAmount, paidAmount) {
    return (totalAmount - paidAmount).toFixed(2);
}

// 导出数据为CSV
function exportToCSV(data, filename, headers) {
    if (!data || !data.length) {
        alert('没有数据可导出');
        return;
    }

    // 创建CSV内容
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(item => {
        const row = headers.map(header => {
            // 处理包含逗号的字段，用引号包裹
            const value = item[header] || '';
            return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
        });
        csvContent += row.join(',') + '\n';
    });

    // 创建下载链接
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 显示通知消息
function showNotification(message, type = 'success', duration = 3000) {
    // 检查通知是否启用
    const settings = getSettings();
    if (!settings.notificationsEnabled && type !== 'error') {
        return;
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-md shadow-lg z-50 transform transition-all duration-300 translate-x-full opacity-0 max-w-sm`;
    
    // 设置不同类型的样式
    if (type === 'success') {
        notification.classList.add('bg-success', 'text-white');
        notification.innerHTML = `<i class="fa fa-check-circle mr-2"></i>${message}`;
    } else if (type === 'error') {
        notification.classList.add('bg-danger', 'text-white');
        notification.innerHTML = `<i class="fa fa-exclamation-circle mr-2"></i>${message}`;
    } else if (type === 'warning') {
        notification.classList.add('bg-warning', 'text-white');
        notification.innerHTML = `<i class="fa fa-exclamation-triangle mr-2"></i>${message}`;
    } else {
        notification.classList.add('bg-primary', 'text-white');
        notification.innerHTML = `<i class="fa fa-info-circle mr-2"></i>${message}`;
    }
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-2 right-2 text-white opacity-75 hover:opacity-100';
    closeBtn.innerHTML = '<i class="fa fa-times"></i>';
    closeBtn.onclick = () => {
        notification.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    };
    notification.appendChild(closeBtn);
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
    }, 100);
    
    // 自动关闭
    if (duration > 0) {
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    return notification;
}

// 初始化页面时加载数据
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    applySettings();
    
    // 检查是否有到期提醒
    checkExpiringItems();
    
    // 添加页面卸载前的确认提示
    window.addEventListener('beforeunload', function(e) {
        // 如果有未保存的更改，显示确认提示
        if (window.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '您有未保存的更改，确定要离开吗？';
            return e.returnValue;
        }
    });
});

// 检查到期项目
function checkExpiringItems() {
    const projects = getAllProjects();
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    
    const expiringProjects = projects.filter(project => {
        const warrantyEndDate = new Date(project.warrantyEndTime);
        return warrantyEndDate <= thirtyDaysLater && warrantyEndDate >= today && !project.warrantyClaimed;
    });
    
    if (expiringProjects.length > 0) {
        setTimeout(() => {
            showNotification(
                `有 ${expiringProjects.length} 个项目的质保金即将到期，请及时处理。`,
                'warning',
                10000
            );
        }, 1000);
    }
}

// 数据备份功能
function backupData() {
    try {
        const data = {
            projects: getAllProjects(true),
            companies: getAllCompanies(true),
            settings: getSettings(),
            logs: JSON.parse(localStorage.getItem('operationLogs') || '[]'),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `project_management_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        logOperation('数据备份', '手动创建数据备份');
        showNotification('数据备份成功');
    } catch (error) {
        console.error('备份失败:', error);
        showNotification('数据备份失败', 'error');
    }
}

// 数据恢复功能
function restoreData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // 验证数据格式
                if (!data.projects || !data.companies) {
                    throw new Error('无效的备份文件格式');
                }
                
                // 恢复数据
                localStorage.setItem('projects', JSON.stringify(data.projects));
                localStorage.setItem('companies', JSON.stringify(data.companies));
                
                if (data.settings) {
                    localStorage.setItem('settings', JSON.stringify(data.settings));
                }
                
                // 清除缓存
                AppCache.clearCache();
                
                logOperation('数据恢复', '从备份文件恢复数据');
                showNotification('数据恢复成功，请刷新页面');
                
                resolve();
            } catch (error) {
                console.error('恢复失败:', error);
                showNotification('数据恢复失败: ' + error.message, 'error');
                reject(error);
            }
        };
        
        reader.onerror = function() {
            showNotification('读取文件失败', 'error');
            reject(new Error('读取文件失败'));
        };
        
        reader.readAsText(file);
    });
}