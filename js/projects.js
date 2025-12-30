// 项目管理功能

// 全局变量
let currentPage = 1;
const itemsPerPage = 10;
let filteredProjects = [];
let selectedProjects = new Set(); // 用于批量操作的选中项目ID集合
let searchTimeout = null; // 用于搜索防抖

document.addEventListener('DOMContentLoaded', function() {
    // 初始化数据
    initializeData();
    
    // 加载项目列表
    loadProjects();
    
    // 加载公司选项
    loadCompanyOptions();
    
    // 绑定按钮事件
    bindButtonEvents();
    
    // 启动性能监控
    startPerformanceMonitoring();
});

// 启动性能监控
function startPerformanceMonitoring() {
    // 监听页面加载性能
    if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        
        console.log(`项目页面加载时间: ${loadTime}ms`);
        logOperation('页面加载', `项目管理页面加载时间: ${loadTime}ms`);
    }
}

// 加载项目列表
function loadProjects() {
    const projects = getAllProjects();
    filteredProjects = [...projects];
    currentPage = 1;
    renderProjectsTable();
    updatePagination();
}

// 渲染项目表格
function renderProjectsTable() {
    const tableBody = document.getElementById('projectsTable');
    
    if (filteredProjects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="17" class="px-6 py-4 text-center text-text-secondary">暂无项目数据</td></tr>';
        updateBatchActions();
        return;
    }
    
    // 计算分页
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex);
    
    // 生成表格行
    let rows = '';
    paginatedProjects.forEach((project, index) => {
        const company = getCompanyById(project.companyId);
        const status = getProjectStatus(project);
        const isSelected = selectedProjects.has(project.id);
        
        rows += `
            <tr class="hover:bg-gray-50 transition-colors duration-150 ${isSelected ? 'bg-blue-50' : ''} cursor-pointer" 
                ondblclick="editProjectByDoubleClick(${startIndex + index})" 
                title="双击编辑项目">
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" 
                           ${isSelected ? 'checked' : ''} onchange="toggleProjectSelection('${project.id}', this.checked)">
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-text-primary">${project.id}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-text-primary">${project.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${company ? company.name : '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${project.clientManager || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${project.contractorManager || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${formatDate(project.startTime)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${formatDate(project.endTime)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${formatDate(project.warrantyEndTime)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-primary font-medium">${formatCurrency(project.totalAmount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-primary">${formatCurrency(project.settlementAmount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-primary">${formatCurrency(project.warrantyAmount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-primary">${formatCurrency(project.paidAmount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-primary">${formatCurrency(project.remainingAmount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-primary">${formatCurrency(project.invoicedAmount)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}">
                        ${status.text}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-primary h-2.5 rounded-full transition-all duration-500" style="width: ${project.completionRate}%"></div>
                    </div>
                    <span class="text-xs text-text-secondary mt-1">${project.completionRate.toFixed(1)}%</span>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-text-secondary truncate max-w-xs" title="${project.remarks || '-'}">${project.remarks || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                    <div class="absolute right-6 opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <button class="action-btn text-danger hover:text-red-700 px-2 py-1 rounded" 
                                onclick="deleteProject(${startIndex + index})"
                                title="删除项目">
                            <i class="fa fa-trash"></i> 删除
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = rows;
    updateBatchActions();
}

// 更新分页信息
function updatePagination() {
    const totalCount = filteredProjects.length;
    const totalPages = Math.ceil(totalCount / itemsPerPage);
    const startRange = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endRange = Math.min(currentPage * itemsPerPage, totalCount);
    
    document.getElementById('startRange').textContent = startRange;
    document.getElementById('endRange').textContent = endRange;
    document.getElementById('totalCount').textContent = totalCount;
    
    // 更新分页按钮状态
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
}

// 加载公司选项
function loadCompanyOptions() {
    const companies = getAllCompanies();
    
    // 加载搜索筛选的公司选项
    const searchSelect = document.getElementById('searchCompany');
    searchSelect.innerHTML = '<option value="">全部公司</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        searchSelect.appendChild(option);
    });
    
    // 加载模态框的公司选项
    const modalSelect = document.getElementById('companyId');
    modalSelect.innerHTML = '<option value="">请选择公司</option>';
    companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        modalSelect.appendChild(option);
    });
}

// 绑定按钮事件
function bindButtonEvents() {
    // 新增项目按钮
    const addProjectBtn = document.getElementById('addProjectBtn');
    if (addProjectBtn) {
        addProjectBtn.addEventListener('click', function() {
            openProjectModal();
        });
    }
    
    // 关闭项目模态框
    const closeProjectModal = document.getElementById('closeProjectModal');
    if (closeProjectModal) {
        closeProjectModal.addEventListener('click', function() {
            closeProjectModalFunc();
        });
    }
    
    // 取消项目按钮
    const cancelProjectBtn = document.getElementById('cancelProjectBtn');
    if (cancelProjectBtn) {
        cancelProjectBtn.addEventListener('click', function() {
            closeProjectModalFunc();
        });
    }
    
    // 提交项目按钮
    const submitProjectBtn = document.getElementById('submitProjectBtn');
    if (submitProjectBtn) {
        submitProjectBtn.addEventListener('click', function() {
            saveProject();
        });
    }
    
    // 搜索按钮
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            searchProjects();
        });
    }
    
    // 重置搜索按钮
    const resetSearchBtn = document.getElementById('resetSearchBtn');
    if (resetSearchBtn) {
        resetSearchBtn.addEventListener('click', function() {
            resetSearch();
        });
    }
    
    // 上一页按钮
    const prevPageBtn = document.getElementById('prevPageBtn');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                renderProjectsTable();
                updatePagination();
                scrollToTop();
            }
        });
    }
    
    // 下一页按钮
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderProjectsTable();
                updatePagination();
                scrollToTop();
            }
        });
    }
    
    // 导出CSV按钮
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', function() {
            exportProjectsToCSV();
        });
    }
    
    // 导入Excel按钮
    const importExcelBtn = document.getElementById('importExcelBtn');
    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', function() {
            openImportModal();
        });
    }
    
    // 关闭导入模态框
    const closeImportModal = document.getElementById('closeImportModal');
    if (closeImportModal) {
        closeImportModal.addEventListener('click', function() {
            closeImportModalFunc();
        });
    }
    
    // 取消导入按钮
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', function() {
            closeImportModalFunc();
        });
    }
    
    // 开始导入按钮
    const startImportBtn = document.getElementById('startImportBtn');
    if (startImportBtn) {
        startImportBtn.addEventListener('click', function() {
            startImportExcel();
        });
    }
    
    // 关闭结果模态框
    const closeResultModal = document.getElementById('closeResultModal');
    if (closeResultModal) {
        closeResultModal.addEventListener('click', function() {
            document.getElementById('importResultModal').classList.add('hidden');
        });
    }
    
    // 关闭结果按钮
    const closeResultBtn = document.getElementById('closeResultBtn');
    if (closeResultBtn) {
        closeResultBtn.addEventListener('click', function() {
            document.getElementById('importResultModal').classList.add('hidden');
        });
    }
    
    // 下载模板按钮
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', function() {
            downloadExcelTemplate();
        });
    }
    
    // 批量删除按钮
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', function() {
            batchDeleteProjects();
        });
    }
    
    // 批量导出按钮
    const batchExportBtn = document.getElementById('batchExportBtn');
    if (batchExportBtn) {
        batchExportBtn.addEventListener('click', function() {
            batchExportProjects();
        });
    }
    
    // 全选按钮
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('change', function() {
            toggleSelectAll(this.checked);
        });
    }
    
    // 回车键搜索
    document.getElementById('searchProjectName').addEventListener('input', function(event) {
        // 防抖搜索
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchProjects();
        }, 300);
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + F 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            document.getElementById('searchProjectName').focus();
        }
        
        // ESC 关闭模态框
        if (e.key === 'Escape') {
            const modal = document.getElementById('projectModal');
            if (modal && !modal.classList.contains('hidden')) {
                closeProjectModalFunc();
            }
        }
    });
}

// 打开项目模态框
function openProjectModal(projectIndex = -1) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('projectModalTitle');
    const form = document.getElementById('projectForm');
    const indexInput = document.getElementById('projectIndex');
    
    // 重置表单
    form.reset();
    indexInput.value = projectIndex;
    
    if (projectIndex === -1) {
        // 新增项目
        title.textContent = '新增项目';
        // 设置默认值
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);
        
        document.getElementById('startTime').valueAsDate = today;
        document.getElementById('endTime').valueAsDate = nextMonth;
        document.getElementById('warrantyRate').value = '5.0';
    } else {
        // 编辑项目
        title.textContent = '编辑项目';
        const project = filteredProjects[projectIndex];
        
        // 填充表单数据
        document.getElementById('projectId').value = project.id;
        document.getElementById('projectName').value = project.name;
        document.getElementById('companyId').value = project.companyId;
        document.getElementById('clientManager').value = project.clientManager || '';
        document.getElementById('contractorManager').value = project.contractorManager || '';
        document.getElementById('startTime').value = project.startTime;
        document.getElementById('endTime').value = project.endTime;
        document.getElementById('warrantyEndTime').value = project.warrantyEndTime;
        document.getElementById('totalAmount').value = project.totalAmount;
        document.getElementById('warrantyRate').value = project.warrantyRate;
        document.getElementById('paidAmount').value = project.paidAmount;
        document.getElementById('invoicedAmount').value = project.invoicedAmount;
        // 设置质保金申请状态
        const warrantyClaimedSelect = document.getElementById('warrantyClaimed');
        for (let i = 0; i < warrantyClaimedSelect.options.length; i++) {
            if (warrantyClaimedSelect.options[i].value === project.warrantyClaimed) {
                warrantyClaimedSelect.selectedIndex = i;
                break;
            }
        }
        document.getElementById('remarks').value = project.remarks || '';
    }
    
    modal.classList.remove('hidden');
    window.hasUnsavedChanges = true;
}

// 关闭项目模态框
function closeProjectModalFunc() {
    document.getElementById('projectModal').classList.add('hidden');
    document.getElementById('projectForm').reset();
    window.hasUnsavedChanges = false;
}

// 保存项目
function saveProject() {
    const form = document.getElementById('projectForm');
    const formData = new FormData(form);
    const projectIndex = parseInt(document.getElementById('projectIndex').value);
    const submitBtn = document.getElementById('submitProjectBtn');
    
    // 禁用提交按钮，防止重复提交
    submitBtn.classList.add('btn-loading');
    submitBtn.disabled = true;
    
    try {
        // 表单验证
        const errors = validateProjectForm(formData);
        if (errors.length > 0) {
            showNotification(errors[0], 'error');
            return;
        }
    
    // 创建项目对象
    const totalAmount = parseFloat(formData.get('totalAmount'));
    const warrantyRate = parseFloat(formData.get('warrantyRate'));
    const paidAmount = parseFloat(formData.get('paidAmount'));
    
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
        settlementAmount: totalAmount - calculateWarrantyAmount(totalAmount, warrantyRate),
        remainingAmount: totalAmount - paidAmount,
        completionRate: calculateCompletionRate(paidAmount, totalAmount),
        
        // 时间戳
        createdAt: projectIndex === -1 ? new Date().toISOString() : filteredProjects[projectIndex].createdAt,
        updatedAt: new Date().toISOString()
    };
    
    // 保存项目
    const projects = getAllProjects(true); // 强制刷新以获取最新数据
    
    if (projectIndex === -1) {
        // 新增项目
        // 检查项目编号是否已存在
        if (projects.some(p => p.id === project.id)) {
            showNotification('项目编号已存在', 'error');
            return;
        }
        
        projects.push(project);
        logOperation('新增项目', `项目ID: ${project.id}, 名称: ${project.name}`);
        showNotification('项目添加成功');
    } else {
        // 编辑项目
        const originalProject = filteredProjects[projectIndex];
        const originalIndex = projects.findIndex(p => p.id === originalProject.id);
        
        // 检查项目编号是否已被其他项目使用
        if (project.id !== originalProject.id && projects.some(p => p.id === project.id)) {
            showNotification('项目编号已存在', 'error');
            return;
        }
        
        projects[originalIndex] = project;
        logOperation('更新项目', `项目ID: ${project.id}, 名称: ${project.name}`);
        showNotification('项目更新成功');
    }
    
    saveProjects(projects);
    
    // 关闭模态框并重置表单
    closeProjectModalFunc();
    
    // 刷新数据
    loadProjects();
} catch (error) {
        console.error('保存项目失败:', error);
        showNotification('保存项目失败: ' + error.message, 'error');
    } finally {
        // 恢复按钮状态
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
    }
}

// 项目表单验证
function validateProjectForm(formData) {
    const errors = [];
    
    if (!formData.get('projectId')) {
        errors.push('请输入项目编号');
    }
    
    if (!formData.get('projectName')) {
        errors.push('请输入项目名称');
    }
    
    if (!formData.get('companyId')) {
        errors.push('请选择公司');
    }
    
    if (!formData.get('startTime')) {
        errors.push('请选择开始时间');
    }
    
    if (!formData.get('endTime')) {
        errors.push('请选择结束时间');
    }
    
    if (!formData.get('warrantyEndTime')) {
        errors.push('请选择质保金结束时间');
    }
    
    const totalAmount = parseFloat(formData.get('totalAmount'));
    if (isNaN(totalAmount) || totalAmount <= 0) {
        errors.push('请输入有效的总金额');
    }
    
    const warrantyRate = parseFloat(formData.get('warrantyRate'));
    if (isNaN(warrantyRate) || warrantyRate < 0 || warrantyRate > 100) {
        errors.push('请输入有效的质保金利率（0-100）');
    }
    
    const paidAmount = parseFloat(formData.get('paidAmount'));
    if (isNaN(paidAmount) || paidAmount < 0) {
        errors.push('请输入有效的支付金额');
    }
    
    const invoicedAmount = parseFloat(formData.get('invoicedAmount'));
    if (isNaN(invoicedAmount) || invoicedAmount < 0) {
        errors.push('请输入有效的开票金额');
    }
    
    // 检查日期逻辑
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
    
    // 检查金额逻辑
    if (paidAmount > totalAmount) {
        errors.push('支付金额不能超过总金额');
    }
    
    if (invoicedAmount > totalAmount) {
        errors.push('开票金额不能超过总金额');
    }
    
    return errors;
}

// 双击编辑项目
function editProjectByDoubleClick(index) {
    const project = filteredProjects[index];
    
    // 检查项目是否可编辑（可以添加业务逻辑，比如已完成的项目不允许编辑）
    const status = getProjectStatus(project);
    if (status.text === '已完成' && project.completionRate === 100) {
        showNotification('已完成的项目不允许编辑', 'warning');
        return;
    }
    
    // 添加双击反馈效果
    const row = event.currentTarget;
    row.classList.add('bg-blue-100');
    setTimeout(() => {
        row.classList.remove('bg-blue-100');
        openProjectModal(index);
    }, 200);
}

// 编辑项目（保留原函数以兼容其他调用）
function editProject(index) {
    editProjectByDoubleClick(index);
}

// 删除项目
function deleteProject(index) {
    const project = filteredProjects[index];
    
    // 显示确认删除模态框
    showDeleteConfirmation(project, function() {
        // 用户确认删除后的回调
        const deleteBtn = document.querySelector('#deleteConfirmBtn');
        deleteBtn.classList.add('btn-loading');
        deleteBtn.disabled = true;
        
        // 模拟异步操作
        setTimeout(() => {
            try {
                const projects = getAllProjects(true); // 强制刷新以获取最新数据
                const originalIndex = projects.findIndex(p => p.id === project.id);
                
                if (originalIndex !== -1) {
                    projects.splice(originalIndex, 1);
                    saveProjects(projects);
                    
                    // 刷新数据
                    loadProjects();
                    
                    // 记录操作日志
                    logOperation('删除项目', `项目ID: ${project.id}, 名称: ${project.name}`);
                    
                    showNotification('项目删除成功', 'success');
                }
            } catch (error) {
                console.error('删除项目失败:', error);
                showNotification('删除项目失败: ' + error.message, 'error');
            } finally {
                // 恢复按钮状态
                deleteBtn.classList.remove('btn-loading');
                deleteBtn.disabled = false;
                closeDeleteModal();
            }
        }, 800);
    });
}

// 显示删除确认模态框
function showDeleteConfirmation(project, confirmCallback) {
    const modal = document.getElementById('deleteModal');
    const projectInfo = document.getElementById('deleteProjectInfo');
    const cancelBtn = document.getElementById('deleteCancelBtn');
    const confirmBtn = document.getElementById('deleteConfirmBtn');
    
    // 设置项目信息
    projectInfo.innerHTML = `
        <div class="mb-4">
            <p class="text-sm text-gray-600">您确定要删除以下项目吗？</p>
            <div class="mt-2 p-3 bg-gray-50 rounded-lg">
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <div><span class="font-medium">项目编号:</span> ${project.id}</div>
                    <div><span class="font-medium">项目名称:</span> ${project.name}</div>
                    <div><span class="font-medium">公司名称:</span> ${getCompanyById(project.companyId)?.name || '-'}</div>
                    <div><span class="font-medium">总金额:</span> ${formatCurrency(project.totalAmount)}</div>
                </div>
            </div>
        </div>
        <div class="text-red-600 text-sm">
            <i class="fa fa-exclamation-triangle mr-1"></i>
            此操作不可撤销，删除后数据将无法恢复。
        </div>
    `;
    
    // 绑定事件
    const handleConfirm = function() {
        confirmCallback();
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleCancel = function() {
        closeDeleteModal();
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    
    // 显示模态框
    modal.classList.remove('hidden');
}

// 关闭删除模态框
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

// 搜索项目
function searchProjects() {
    const searchProjectName = document.getElementById('searchProjectName').value.toLowerCase();
    const searchCompany = document.getElementById('searchCompany').value;
    const searchStatus = document.getElementById('searchStatus').value;
    
    const projects = getAllProjects();
    
    filteredProjects = projects.filter(project => {
        // 按项目名称搜索
        const matchName = !searchProjectName || project.name.toLowerCase().includes(searchProjectName);
        
        // 按公司搜索
        const matchCompany = !searchCompany || project.companyId === searchCompany;
        
        // 按状态搜索
        let matchStatus = true;
        if (searchStatus) {
            const status = getProjectStatus(project);
            if (searchStatus === 'ongoing' && status.text !== '进行中') matchStatus = false;
            else if (searchStatus === 'completed' && status.text !== '已完成') matchStatus = false;
            else if (searchStatus === 'warranty' && status.text !== '质保期') matchStatus = false;
        }
        
        return matchName && matchCompany && matchStatus;
    });
    
    // 清空选中状态
    selectedProjects.clear();
    
    currentPage = 1;
    renderProjectsTable();
    updatePagination();
}

// 重置搜索
function resetSearch() {
    document.getElementById('searchProjectName').value = '';
    document.getElementById('searchCompany').value = '';
    document.getElementById('searchStatus').value = '';
    
    loadProjects();
}

// 切换项目选择状态
function toggleProjectSelection(projectId, isSelected) {
    if (isSelected) {
        selectedProjects.add(projectId);
    } else {
        selectedProjects.delete(projectId);
    }
    updateBatchActions();
}

// 全选/取消全选
function toggleSelectAll(selectAll) {
    selectedProjects.clear();
    
    if (selectAll) {
        // 获取当前页的项目ID
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentPageProjects = filteredProjects.slice(startIndex, endIndex);
        
        currentPageProjects.forEach(project => {
            selectedProjects.add(project.id);
        });
    }
    
    renderProjectsTable();
}

// 更新批量操作按钮状态
function updateBatchActions() {
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    const batchExportBtn = document.getElementById('batchExportBtn');
    
    if (batchDeleteBtn) {
        batchDeleteBtn.disabled = selectedProjects.size === 0;
        batchDeleteBtn.classList.toggle('opacity-50', selectedProjects.size === 0);
    }
    
    if (batchExportBtn) {
        batchExportBtn.disabled = selectedProjects.size === 0;
        batchExportBtn.classList.toggle('opacity-50', selectedProjects.size === 0);
    }
}

// 批量删除项目
function batchDeleteProjects() {
    if (selectedProjects.size === 0) {
        showNotification('请选择要删除的项目', 'warning');
        return;
    }
    
    if (confirm(`确定要删除选中的 ${selectedProjects.size} 个项目吗？此操作不可撤销。`)) {
        const projects = getAllProjects(true); // 强制刷新以获取最新数据
        
        // 删除选中的项目
        const remainingProjects = projects.filter(project => !selectedProjects.has(project.id));
        
        // 记录删除的项目信息
        const deletedProjects = projects.filter(project => selectedProjects.has(project.id));
        deletedProjects.forEach(project => {
            logOperation('批量删除项目', `项目ID: ${project.id}, 名称: ${project.name}`);
        });
        
        saveProjects(remainingProjects);
        
        // 清空选中状态
        selectedProjects.clear();
        
        // 刷新数据
        loadProjects();
        
        showNotification(`成功删除 ${selectedProjects.size} 个项目`);
    }
}

// 批量导出项目
function batchExportProjects() {
    if (selectedProjects.size === 0) {
        showNotification('请选择要导出的项目', 'warning');
        return;
    }
    
    const projects = getAllProjects();
    const selectedProjectsData = projects.filter(project => selectedProjects.has(project.id));
    
    if (selectedProjectsData.length === 0) {
        showNotification('没有找到选中的项目数据', 'warning');
        return;
    }
    
    // 准备导出数据
    const exportData = selectedProjectsData.map(project => {
        const company = getCompanyById(project.companyId);
        const status = getProjectStatus(project);
        
        return {
            '项目编号': project.id,
            '项目名称': project.name,
            '公司名称': company ? company.name : '',
            '甲方负责人': project.clientManager || '',
            '乙方负责人': project.contractorManager || '',
            '开始时间': formatDate(project.startTime),
            '结束时间': formatDate(project.endTime),
            '质保金结束时间': formatDate(project.warrantyEndTime),
            '总金额': project.totalAmount,
            '结算金额': project.settlementAmount,
            '质保金额': project.warrantyAmount,
            '质保金利率(%)': project.warrantyRate,
            '支付金额': project.paidAmount,
            '剩余金额': project.remainingAmount,
            '已申请发票金额': project.invoicedAmount,
            '质保金申请状态': project.warrantyClaimed,
            '金额完成率(%)': project.completionRate,
            '项目状态': status.text,
            '备注': project.remarks || ''
        };
    });
    
    // 导出文件
    const headers = Object.keys(exportData[0]);
    const filename = `项目数据_选中_${new Date().toLocaleDateString('zh-CN')}.csv`;
    
    exportToCSV(exportData, filename, headers);
    
    logOperation('批量导出项目', `导出了 ${selectedProjects.size} 个项目`);
    showNotification(`成功导出 ${selectedProjects.size} 个项目`);
}

// 滚动到顶部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 打开导入模态框
function openImportModal() {
    const modal = document.getElementById('importModal');
    const fileInput = document.getElementById('excelFileInput');
    
    // 重置表单
    fileInput.value = '';
    document.getElementById('importModeAdd').checked = true;
    document.getElementById('importProgress').classList.add('hidden');
    document.getElementById('importProgressBar').style.width = '0%';
    document.getElementById('importProgressText').textContent = '准备导入...';
    
    modal.classList.remove('hidden');
}

// 关闭导入模态框
function closeImportModalFunc() {
    document.getElementById('importModal').classList.add('hidden');
}

// 开始导入Excel文件
function startImportExcel() {
    const fileInput = document.getElementById('excelFileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('请选择Excel文件', 'error');
        return;
    }
    
    // 检查文件类型
    const fileType = file.name.split('.').pop().toLowerCase();
    if (fileType !== 'xlsx' && fileType !== 'xls') {
        showNotification('请选择.xlsx或.xls格式的文件', 'error');
        return;
    }
    
    const importMode = document.querySelector('input[name="importMode"]:checked').value;
    
    // 显示进度条
    document.getElementById('importProgress').classList.remove('hidden');
    updateImportProgress(10, '正在读取文件...');
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            updateImportProgress(30, '正在解析Excel文件...');
            
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // 获取第一个工作表
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            updateImportProgress(50, '正在转换数据...');
            
            // 转换为JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                showNotification('Excel文件中没有数据', 'warning');
                closeImportModalFunc();
                return;
            }
            
            updateImportProgress(70, '正在验证数据...');
            
            // 处理导入的数据
            processImportedData(jsonData, importMode);
            
        } catch (error) {
            console.error('导入失败:', error);
            showNotification('Excel文件解析失败: ' + error.message, 'error');
            closeImportModalFunc();
        }
    };
    
    reader.onerror = function() {
        showNotification('文件读取失败', 'error');
        closeImportModalFunc();
    };
    
    reader.readAsArrayBuffer(file);
}

// 处理导入的数据
function processImportedData(jsonData, importMode) {
    updateImportProgress(80, '正在处理数据...');
    
    const results = {
        total: jsonData.length,
        success: 0,
        failed: 0,
        errors: []
    };
    
    const importedProjects = [];
    const existingProjects = importMode === 'add' ? getAllProjects(true) : [];
    const existingIds = new Set(existingProjects.map(p => p.id));
    
    // 映射Excel列名到系统字段名
    const columnMapping = {
        '项目编号': 'id',
        '项目名称': 'name',
        '公司名称': 'companyName',
        '甲方负责人': 'clientManager',
        '乙方负责人': 'contractorManager',
        '开始时间': 'startTime',
        '结束时间': 'endTime',
        '质保金结束时间': 'warrantyEndTime',
        '总金额': 'totalAmount',
        '质保金利率': 'warrantyRate',
        '支付金额': 'paidAmount',
        '已申请发票金额': 'invoicedAmount',
        '质保金申请状态': 'warrantyClaimed',
        '备注': 'remarks'
    };
    
    jsonData.forEach((row, index) => {
        try {
            const project = {};
            let hasError = false;
            const rowErrors = [];
            
            // 映射列名并验证必填字段
            for (const [excelCol, systemCol] of Object.entries(columnMapping)) {
                if (systemCol === 'companyName') {
                    // 特殊处理公司名称，需要查找公司ID
                    const companyName = row[excelCol];
                    if (!companyName) {
                        rowErrors.push(`缺少公司名称`);
                        hasError = true;
                    } else {
                        const company = findCompanyByName(companyName);
                        if (company) {
                            project.companyId = company.id;
                        } else {
                            rowErrors.push(`找不到公司: ${companyName}`);
                            hasError = true;
                        }
                    }
                } else if (systemCol === 'warrantyClaimed') {
                    // 处理布尔值
                    const value = row[excelCol];
                    project[systemCol] = value === '是' || value === 'true' || value === true;
                } else if (systemCol === 'totalAmount' || systemCol === 'warrantyRate' || 
                           systemCol === 'paidAmount' || systemCol === 'invoicedAmount') {
                    // 处理数字
                    const value = parseFloat(row[excelCol]);
                    if (isNaN(value)) {
                        rowErrors.push(`${excelCol} 不是有效的数字`);
                        hasError = true;
                    } else {
                        project[systemCol] = value;
                    }
                } else {
                    // 其他字段
                    project[systemCol] = row[excelCol];
                }
            }
            
            // 验证必填字段
            const requiredFields = ['id', 'name', 'companyId', 'startTime', 'endTime', 'warrantyEndTime', 'totalAmount'];
            requiredFields.forEach(field => {
                if (!project[field]) {
                    rowErrors.push(`缺少必填字段: ${getFieldDisplayName(field)}`);
                    hasError = true;
                }
            });
            
            // 检查项目编号是否重复
            if (existingIds.has(project.id)) {
                rowErrors.push(`项目编号已存在: ${project.id}`);
                hasError = true;
            }
            
            if (hasError) {
                results.failed++;
                results.errors.push({
                    row: index + 2, // Excel行号从1开始，且有表头
                    projectId: project.id || '未知',
                    errors: rowErrors
                });
            } else {
                // 计算派生字段
                project.warrantyAmount = project.totalAmount * (project.warrantyRate / 100);
                project.settlementAmount = project.totalAmount - project.warrantyAmount;
                project.remainingAmount = project.totalAmount - project.paidAmount;
                project.completionRate = project.totalAmount > 0 ? (project.paidAmount / project.totalAmount) * 100 : 0;
                
                // 添加时间戳
                project.createdAt = new Date().toISOString();
                project.updatedAt = new Date().toISOString();
                
                importedProjects.push(project);
                existingIds.add(project.id);
                results.success++;
            }
            
        } catch (error) {
            results.failed++;
            results.errors.push({
                row: index + 2,
                projectId: '未知',
                errors: ['数据处理错误: ' + error.message]
            });
        }
        
        // 更新进度
        const progress = 80 + Math.round((index + 1) / jsonData.length * 20);
        updateImportProgress(progress, `正在处理第 ${index + 1}/${jsonData.length} 条数据...`);
    });
    
    updateImportProgress(100, '导入完成！');
    
    // 保存导入的项目
    if (importedProjects.length > 0) {
        const allProjects = [...existingProjects, ...importedProjects];
        saveProjects(allProjects);
        
        // 记录操作日志
        logOperation('导入Excel数据', `成功导入 ${results.success} 个项目，失败 ${results.failed} 个`);
    }
    
    // 显示导入结果
    showImportResult(results);
    
    // 刷新数据
    if (importedProjects.length > 0) {
        setTimeout(() => {
            loadProjects();
            closeImportModalFunc();
        }, 1000);
    }
}

// 更新导入进度
function updateImportProgress(percentage, text) {
    document.getElementById('importProgressBar').style.width = percentage + '%';
    document.getElementById('importProgressText').textContent = text;
}

// 显示导入结果
function showImportResult(results) {
    const content = document.getElementById('importResultContent');
    
    let html = `
        <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-lg font-medium">导入统计</span>
                <span class="text-sm text-text-secondary">总记录: ${results.total}</span>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-green-50 p-3 rounded-md">
                    <div class="text-sm text-text-secondary">成功</div>
                    <div class="text-xl font-bold text-success">${results.success}</div>
                </div>
                <div class="bg-red-50 p-3 rounded-md">
                    <div class="text-sm text-text-secondary">失败</div>
                    <div class="text-xl font-bold text-danger">${results.failed}</div>
                </div>
            </div>
        </div>
    `;
    
    if (results.errors.length > 0) {
        html += `
            <div class="mt-4">
                <h4 class="text-md font-medium mb-2 text-danger">错误详情</h4>
                <div class="max-h-64 overflow-y-auto">
                    <table class="min-w-full text-sm">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 py-2 text-left">行号</th>
                                <th class="px-3 py-2 text-left">项目编号</th>
                                <th class="px-3 py-2 text-left">错误信息</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
        `;
        
        results.errors.forEach(error => {
            html += `
                <tr>
                    <td class="px-3 py-2">${error.row}</td>
                    <td class="px-3 py-2">${error.projectId}</td>
                    <td class="px-3 py-2 text-danger">
                        <ul class="list-disc list-inside">
                            ${error.errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
    document.getElementById('importResultModal').classList.remove('hidden');
}

// 根据公司名称查找公司
function findCompanyByName(companyName) {
    const companies = getAllCompanies();
    return companies.find(c => c.name === companyName);
}

// 获取字段显示名称
function getFieldDisplayName(fieldName) {
    const displayNames = {
        'id': '项目编号',
        'name': '项目名称',
        'companyId': '公司名称',
        'startTime': '开始时间',
        'endTime': '结束时间',
        'warrantyEndTime': '质保金结束时间',
        'totalAmount': '总金额'
    };
    return displayNames[fieldName] || fieldName;
}

// 下载Excel模板
function downloadExcelTemplate() {
    try {
        // 创建模板数据
        const templateData = [
            {
                '项目编号': 'PROJ001',
                '项目名称': '示例项目1',
                '公司名称': '示例公司1',
                '甲方负责人': '张三',
                '乙方负责人': '李四',
                '开始时间': '2024-01-01',
                '结束时间': '2024-12-31',
                '质保金结束时间': '2025-12-31',
                '总金额': 100000,
                '质保金利率': 5,
                '支付金额': 80000,
                '已申请发票金额': 80000,
                '质保金申请状态': '未申请',
                '备注': '示例项目备注'
            },
            {
                '项目编号': 'PROJ002',
                '项目名称': '示例项目2',
                '公司名称': '示例公司2',
                '甲方负责人': '王五',
                '乙方负责人': '赵六',
                '开始时间': '2024-02-01',
                '结束时间': '2024-11-30',
                '质保金结束时间': '2025-11-30',
                '总金额': 200000,
                '质保金利率': 3,
                '支付金额': 150000,
                '已申请发票金额': 150000,
                '质保金申请状态': '已申请',
                '备注': ''
            }
        ];
        
        // 创建工作簿
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // 设置列宽
        const colWidths = [
            { wch: 12 }, // 项目编号
            { wch: 20 }, // 项目名称
            { wch: 20 }, // 公司名称
            { wch: 15 }, // 甲方负责人
            { wch: 15 }, // 乙方负责人
            { wch: 15 }, // 开始时间
            { wch: 15 }, // 结束时间
            { wch: 20 }, // 质保金结束时间
            { wch: 12 }, // 总金额
            { wch: 12 }, // 质保金利率
            { wch: 12 }, // 支付金额
            { wch: 15 }, // 已申请发票金额
            { wch: 15 }, // 质保金是否申请
            { wch: 30 }  // 备注
        ];
        worksheet['!cols'] = colWidths;
        
        // 添加工作表到工作簿
        XLSX.utils.book_append_sheet(workbook, worksheet, '项目模板');
        
        // 生成Excel文件并下载
        const fileName = `项目导入模板_${formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        showNotification('模板下载成功', 'success');
        
        // 记录操作日志
        logOperation('下载Excel模板', `下载了项目导入模板文件: ${fileName}`);
        
    } catch (error) {
        console.error('下载模板失败:', error);
        showNotification('模板下载失败: ' + error.message, 'error');
    }
}

// 导出项目数据为CSV
function exportProjectsToCSV() {
    if (filteredProjects.length === 0) {
        showNotification('没有数据可导出', 'warning');
        return;
    }
    
    // 准备导出数据
    const exportData = filteredProjects.map(project => {
        const company = getCompanyById(project.companyId);
        const status = getProjectStatus(project);
        
        return {
            '项目编号': project.id,
            '项目名称': project.name,
            '公司名称': company ? company.name : '',
            '甲方负责人': project.clientManager || '',
            '乙方负责人': project.contractorManager || '',
            '开始时间': formatDate(project.startTime),
            '结束时间': formatDate(project.endTime),
            '质保金结束时间': formatDate(project.warrantyEndTime),
            '总金额': project.totalAmount,
            '结算金额': project.settlementAmount,
            '质保金额': project.warrantyAmount,
            '质保金利率(%)': project.warrantyRate,
            '支付金额': project.paidAmount,
            '剩余金额': project.remainingAmount,
            '已申请发票金额': project.invoicedAmount,
            '质保金申请状态': project.warrantyClaimed,
            '金额完成率(%)': project.completionRate,
            '项目状态': status.text,
            '备注': project.remarks || ''
        };
    });
    
    // 导出文件
    const headers = Object.keys(exportData[0]);
    const filename = `项目数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
    
    exportToCSV(exportData, filename, headers);
}