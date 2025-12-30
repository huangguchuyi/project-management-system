// 首页统计看板功能

document.addEventListener('DOMContentLoaded', function() {
    // 初始化数据
    initializeData();
    
    // 加载统计数据
    loadDashboardData();
    
    // 加载图表
    loadCharts();
    
    // 加载最近项目
    loadRecentProjects();
    
    // 绑定按钮事件
    bindButtonEvents();
});

// 加载统计数据
function loadDashboardData() {
    const projects = getAllProjects();
    const companies = getAllCompanies();
    
    // 计算统计数据
    const totalProjects = projects.length;
    const totalPaid = projects.reduce((sum, project) => sum + (project.paidAmount || 0), 0);
    const totalRemaining = projects.reduce((sum, project) => sum + (project.remainingAmount || 0), 0);
    const totalWarranty = projects.reduce((sum, project) => sum + (project.warrantyAmount || 0), 0);
    
    // 更新UI
    document.getElementById('totalProjects').textContent = totalProjects;
    document.getElementById('totalPaid').textContent = formatCurrency(totalPaid);
    document.getElementById('totalRemaining').textContent = formatCurrency(totalRemaining);
    document.getElementById('totalWarranty').textContent = formatCurrency(totalWarranty);
    
    // 计算趋势（这里使用模拟数据，实际应用中应该从历史数据计算）
    const trends = calculateTrends(projects);
    updateTrends(trends);
}

// 计算趋势数据（模拟）
function calculateTrends(projects) {
    // 模拟上月数据（实际应用中应该从历史数据获取）
    const lastMonth = {
        totalProjects: Math.max(0, projects.length - Math.floor(Math.random() * 3)),
        totalPaid: projects.reduce((sum, project) => sum + (project.paidAmount || 0), 0) * 0.9,
        totalRemaining: projects.reduce((sum, project) => sum + (project.remainingAmount || 0), 0) * 1.1,
        totalWarranty: projects.reduce((sum, project) => sum + (project.warrantyAmount || 0), 0) * 0.95
    };
    
    // 计算当前数据
    const current = {
        totalProjects: projects.length,
        totalPaid: projects.reduce((sum, project) => sum + (project.paidAmount || 0), 0),
        totalRemaining: projects.reduce((sum, project) => sum + (project.remainingAmount || 0), 0),
        totalWarranty: projects.reduce((sum, project) => sum + (project.warrantyAmount || 0), 0)
    };
    
    // 计算趋势百分比
    return {
        projectTrend: calculatePercentageChange(current.totalProjects, lastMonth.totalProjects),
        paidTrend: calculatePercentageChange(current.totalPaid, lastMonth.totalPaid),
        remainingTrend: calculatePercentageChange(current.totalRemaining, lastMonth.totalRemaining),
        warrantyTrend: calculatePercentageChange(current.totalWarranty, lastMonth.totalWarranty)
    };
}

// 计算百分比变化
function calculatePercentageChange(current, previous) {
    if (!previous) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
}

// 更新趋势显示
function updateTrends(trends) {
    updateTrendElement('projectTrend', trends.projectTrend);
    updateTrendElement('paidTrend', trends.paidTrend);
    updateTrendElement('remainingTrend', trends.remainingTrend);
    updateTrendElement('warrantyTrend', trends.warrantyTrend);
}

// 更新单个趋势元素
function updateTrendElement(elementId, trendValue) {
    const element = document.getElementById(elementId);
    const isPositive = parseFloat(trendValue) >= 0;
    
    element.innerHTML = `
        <i class="fa fa-arrow-${isPositive ? 'up' : 'down'} mr-1"></i>
        ${Math.abs(trendValue)}%
    `;
    
    element.className = isPositive ? 'text-success text-sm font-medium flex items-center' : 'text-danger text-sm font-medium flex items-center';
}

// 加载图表
function loadCharts() {
    loadProjectStatusChart();
    loadMonthlyTrendChart();
}

// 加载项目状态分布饼图
function loadProjectStatusChart() {
    const projects = getAllProjects();
    
    // 计算不同状态的项目数量
    const statusCounts = {
        ongoing: 0,
        warranty: 0,
        completed: 0
    };
    
    projects.forEach(project => {
        const status = getProjectStatus(project);
        if (status.text === '进行中') statusCounts.ongoing++;
        else if (status.text === '质保期') statusCounts.warranty++;
        else if (status.text === '已完成') statusCounts.completed++;
    });
    
    // 创建图表
    const ctx = document.getElementById('projectStatusChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['进行中', '质保期', '已完成'],
            datasets: [{
                data: [statusCounts.ongoing, statusCounts.warranty, statusCounts.completed],
                backgroundColor: [
                    '#1a56db', // primary
                    '#f59e0b', // warning
                    '#10b981'  // success
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// 加载月度收支趋势图
function loadMonthlyTrendChart() {
    const projects = getAllProjects();
    
    // 获取最近6个月的数据
    const months = [];
    const paidData = [];
    const remainingData = [];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' });
        
        months.push(month);
        
        // 模拟月度数据（实际应用中应该从项目的时间和金额计算）
        const monthPaid = projects.reduce((sum, project) => {
            const projectDate = new Date(project.startTime);
            if (projectDate.getMonth() === date.getMonth() && projectDate.getFullYear() === date.getFullYear()) {
                return sum + (project.paidAmount || 0) * (0.5 + Math.random() * 0.5);
            }
            return sum;
        }, 0);
        
        const monthRemaining = projects.reduce((sum, project) => {
            const projectDate = new Date(project.startTime);
            if (projectDate.getMonth() === date.getMonth() && projectDate.getFullYear() === date.getFullYear()) {
                return sum + (project.remainingAmount || 0) * (0.5 + Math.random() * 0.5);
            }
            return sum;
        }, 0);
        
        paidData.push(monthPaid);
        remainingData.push(monthRemaining);
    }
    
    // 创建图表
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: '已支付',
                    data: paidData,
                    backgroundColor: '#10b981', // success
                    borderRadius: 4
                },
                {
                    label: '待支付',
                    data: remainingData,
                    backgroundColor: '#f59e0b', // warning
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatCurrency(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 加载最近项目
function loadRecentProjects() {
    const projects = getAllProjects();
    const recentProjects = projects
        .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
        .slice(0, 5);
    
    const tableBody = document.getElementById('recentProjectsTable');
    
    if (recentProjects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-text-secondary">暂无项目数据</td></tr>';
        return;
    }
    
    // 生成表格行
    let rows = '';
    recentProjects.forEach(project => {
        const company = getCompanyById(project.companyId);
        const status = getProjectStatus(project);
        
        rows += `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-text-primary">${project.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${company ? company.name : '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${formatDate(project.startTime)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-primary">${formatCurrency(project.totalAmount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-primary h-2.5 rounded-full" style="width: ${project.completionRate}%"></div>
                    </div>
                    <span class="text-xs text-text-secondary mt-1">${project.completionRate}%</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.class}">
                        ${status.text}
                    </span>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = rows;
}

// 绑定按钮事件
function bindButtonEvents() {
    // 录入项目按钮
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', function() {
            document.getElementById('addProjectModal').classList.remove('hidden');
            loadCompanyOptions();
        });
    }
    
    // 录入公司按钮
    const addCompanyBtn = document.getElementById('addCompanyBtn');
    if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', function() {
            document.getElementById('addCompanyModal').classList.remove('hidden');
        });
    }
    
    // 关闭项目模态框
    const closeProjectModal = document.getElementById('closeProjectModal');
    if (closeProjectModal) {
        closeProjectModal.addEventListener('click', function() {
            document.getElementById('addProjectModal').classList.add('hidden');
            document.getElementById('projectForm').reset();
        });
    }
    
    // 取消项目按钮
    const cancelProjectBtn = document.getElementById('cancelProjectBtn');
    if (cancelProjectBtn) {
        cancelProjectBtn.addEventListener('click', function() {
            document.getElementById('addProjectModal').classList.add('hidden');
            document.getElementById('projectForm').reset();
        });
    }
    
    // 提交项目按钮
    const submitProjectBtn = document.getElementById('submitProjectBtn');
    if (submitProjectBtn) {
        submitProjectBtn.addEventListener('click', function() {
            saveNewProject();
        });
    }
    
    // 关闭公司模态框
    const closeCompanyModal = document.getElementById('closeCompanyModal');
    if (closeCompanyModal) {
        closeCompanyModal.addEventListener('click', function() {
            document.getElementById('addCompanyModal').classList.add('hidden');
            document.getElementById('companyForm').reset();
        });
    }
    
    // 取消公司按钮
    const cancelCompanyBtn = document.getElementById('cancelCompanyBtn');
    if (cancelCompanyBtn) {
        cancelCompanyBtn.addEventListener('click', function() {
            document.getElementById('addCompanyModal').classList.add('hidden');
            document.getElementById('companyForm').reset();
        });
    }
    
    // 提交公司按钮
    const submitCompanyBtn = document.getElementById('submitCompanyBtn');
    if (submitCompanyBtn) {
        submitCompanyBtn.addEventListener('click', function() {
            saveNewCompany();
        });
    }
}

// 加载公司选项
function loadCompanyOptions() {
    const companies = getAllCompanies();
    const select = document.getElementById('companyId');
    
    // 清空现有选项
    select.innerHTML = '<option value="">请选择公司</option>';
    
    // 添加公司选项
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        select.appendChild(option);
    });
}

// 保存新项目
function saveNewProject() {
    const form = document.getElementById('projectForm');
    const formData = new FormData(form);
    
    // 表单验证
    const errors = [];
    
    // 验证必填字段
    if (!formData.get('projectId')) errors.push('请输入项目编号');
    if (!formData.get('projectName')) errors.push('请输入项目名称');
    if (!formData.get('companyId')) errors.push('请选择公司名称');
    if (!formData.get('startTime')) errors.push('请选择开始时间');
    if (!formData.get('endTime')) errors.push('请选择结束时间');
    if (!formData.get('warrantyEndTime')) errors.push('请选择质保金结束时间');
    
    // 验证数字字段
    const totalAmount = parseFloat(formData.get('totalAmount'));
    if (isNaN(totalAmount) || totalAmount <= 0) errors.push('请输入有效的总金额');
    
    const warrantyRate = parseFloat(formData.get('warrantyRate'));
    if (isNaN(warrantyRate) || warrantyRate < 0 || warrantyRate > 100) errors.push('请输入有效的质保金利率（0-100）');
    
    // 支付金额和开票金额不再是必填项，但如果填写了需要验证
    const paidAmount = parseFloat(formData.get('paidAmount') || 0);
    if (!isNaN(paidAmount) && paidAmount < 0) errors.push('支付金额不能为负数');
    
    const invoicedAmount = parseFloat(formData.get('invoicedAmount') || 0);
    if (!isNaN(invoicedAmount) && invoicedAmount < 0) errors.push('开票金额不能为负数');
    
    // 验证日期逻辑
    if (formData.get('endTime') && formData.get('startTime')) {
        if (new Date(formData.get('endTime')) < new Date(formData.get('startTime'))) {
            errors.push('结束时间不能早于开始时间');
        }
    }
    
    if (formData.get('warrantyEndTime') && formData.get('endTime')) {
        if (new Date(formData.get('warrantyEndTime')) < new Date(formData.get('endTime'))) {
            errors.push('质保金结束时间不能早于项目结束时间');
        }
    }
    
    // 验证金额逻辑
    if (!isNaN(totalAmount) && !isNaN(paidAmount) && paidAmount > totalAmount) {
        errors.push('支付金额不能大于总金额');
    }
    
    if (!isNaN(totalAmount) && !isNaN(invoicedAmount) && invoicedAmount > totalAmount) {
        errors.push('开票金额不能大于总金额');
    }
    
    if (errors.length > 0) {
        showNotification(errors[0], 'error');
        return;
    }
    
    // 创建项目对象
    
    const project = {
        id: formData.get('projectId'),
        name: formData.get('projectName'),
        companyId: formData.get('companyId'),
        clientManager: formData.get('clientManager'),
        contractorManager: formData.get('contractorManager'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        warrantyEndTime: formData.get('warrantyEndTime'),
        totalAmount: totalAmount,
        warrantyRate: warrantyRate,
        paidAmount: paidAmount,
        invoicedAmount: parseFloat(formData.get('invoicedAmount')),
        warrantyClaimed: formData.get('warrantyClaimed') || '未申请',
        remarks: formData.get('remarks') || '',
        
        // 计算字段
        warrantyAmount: calculateWarrantyAmount(totalAmount, warrantyRate),
        remainingAmount: calculateRemainingAmount(totalAmount, paidAmount),
        completionRate: calculateCompletionRate(paidAmount, totalAmount),
        settlementAmount: totalAmount // 默认结算金额等于总金额
    };
    
    // 保存项目
    const projects = getAllProjects();
    
    // 检查项目编号是否已存在
    if (projects.some(p => p.id === project.id)) {
        showNotification('项目编号已存在', 'error');
        return;
    }
    
    projects.push(project);
    saveProjects(projects);
    
    // 关闭模态框并重置表单
    document.getElementById('addProjectModal').classList.add('hidden');
    form.reset();
    
    // 刷新数据
    loadDashboardData();
    loadCharts();
    loadRecentProjects();
    
    showNotification('项目添加成功');
}

// 保存新公司
function saveNewCompany() {
    const form = document.getElementById('companyForm');
    const formData = new FormData(form);
    
    // 验证必填字段
    if (!formData.get('companyId') || !formData.get('companyName')) {
        showNotification('请填写公司编号和名称', 'error');
        return;
    }
    
    // 创建公司对象
    const company = {
        id: formData.get('companyId'),
        name: formData.get('companyName'),
        remarks: formData.get('companyRemarks') || ''
    };
    
    // 保存公司
    const companies = getAllCompanies();
    
    // 检查公司编号是否已存在
    if (companies.some(c => c.id === company.id)) {
        showNotification('公司编号已存在', 'error');
        return;
    }
    
    companies.push(company);
    saveCompanies(companies);
    
    // 关闭模态框并重置表单
    document.getElementById('addCompanyModal').classList.add('hidden');
    form.reset();
    
    // 刷新公司选项
    loadCompanyOptions();
    
    showNotification('公司添加成功');
}