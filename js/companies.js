// 公司管理功能

// 全局变量
let currentPage = 1;
const itemsPerPage = 10;
let filteredCompanies = [];

document.addEventListener('DOMContentLoaded', function() {
    // 初始化数据
    initializeData();
    
    // 加载公司列表
    loadCompanies();
    
    // 绑定按钮事件
    bindButtonEvents();
});

// 加载公司列表
function loadCompanies() {
    const companies = getAllCompanies();
    filteredCompanies = [...companies];
    currentPage = 1;
    renderCompaniesTable();
    updatePagination();
}

// 渲染公司表格
function renderCompaniesTable() {
    const tableBody = document.getElementById('companiesTable');
    
    if (filteredCompanies.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-text-secondary">暂无公司数据</td></tr>';
        return;
    }
    
    // 计算分页
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);
    
    // 获取项目数据，用于计算每个公司关联的项目数
    const projects = getAllProjects();
    
    // 生成表格行
    let rows = '';
    paginatedCompanies.forEach((company, index) => {
        // 计算关联项目数
        const projectCount = projects.filter(project => project.companyId === company.id).length;
        
        rows += `
            <tr class="hover:bg-gray-50 cursor-pointer" 
                ondblclick="editCompanyByDoubleClick(${startIndex + index})" 
                title="双击编辑公司">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-text-primary">${company.id}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm font-medium text-text-primary">${company.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-text-secondary">${projectCount}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="text-sm text-text-secondary">${company.remarks || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                    <div class="absolute right-6 opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <button class="text-danger hover:text-red-700 px-2 py-1 rounded" 
                                onclick="deleteCompany(${startIndex + index})"
                                title="删除公司">
                            <i class="fa fa-trash"></i> 删除
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = rows;
}

// 更新分页信息
function updatePagination() {
    const totalCount = filteredCompanies.length;
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

// 绑定按钮事件
function bindButtonEvents() {
    // 新增公司按钮
    const addCompanyBtn = document.getElementById('addCompanyBtn');
    if (addCompanyBtn) {
        addCompanyBtn.addEventListener('click', function() {
            openCompanyModal();
        });
    }
    
    // 关闭公司模态框
    const closeCompanyModal = document.getElementById('closeCompanyModal');
    if (closeCompanyModal) {
        closeCompanyModal.addEventListener('click', function() {
            closeCompanyModalFunc();
        });
    }
    
    // 取消公司按钮
    const cancelCompanyBtn = document.getElementById('cancelCompanyBtn');
    if (cancelCompanyBtn) {
        cancelCompanyBtn.addEventListener('click', function() {
            closeCompanyModalFunc();
        });
    }
    
    // 提交公司按钮
    const submitCompanyBtn = document.getElementById('submitCompanyBtn');
    if (submitCompanyBtn) {
        submitCompanyBtn.addEventListener('click', function() {
            saveCompany();
        });
    }
    
    // 搜索按钮
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            searchCompanies();
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
                renderCompaniesTable();
                updatePagination();
            }
        });
    }
    
    // 下一页按钮
    const nextPageBtn = document.getElementById('nextPageBtn');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderCompaniesTable();
                updatePagination();
            }
        });
    }
    
    // 导出CSV按钮
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', function() {
            exportCompaniesToCSV();
        });
    }
    
    // 回车键搜索
    document.getElementById('searchCompanyName').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchCompanies();
        }
    });
    
    document.getElementById('searchCompanyId').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            searchCompanies();
        }
    });
}

// 打开公司模态框
function openCompanyModal(companyIndex = -1) {
    const modal = document.getElementById('companyModal');
    const title = document.getElementById('companyModalTitle');
    const form = document.getElementById('companyForm');
    const indexInput = document.getElementById('companyIndex');
    
    // 重置表单
    form.reset();
    indexInput.value = companyIndex;
    
    if (companyIndex === -1) {
        // 新增公司
        title.textContent = '新增公司';
    } else {
        // 编辑公司
        title.textContent = '编辑公司';
        const company = filteredCompanies[companyIndex];
        
        // 填充表单数据
        document.getElementById('companyId').value = company.id;
        document.getElementById('companyName').value = company.name;
        document.getElementById('companyRemarks').value = company.remarks || '';
    }
    
    modal.classList.remove('hidden');
}

// 关闭公司模态框
function closeCompanyModalFunc() {
    document.getElementById('companyModal').classList.add('hidden');
    document.getElementById('companyForm').reset();
}

// 保存公司
function saveCompany() {
    const form = document.getElementById('companyForm');
    const formData = new FormData(form);
    const companyIndex = parseInt(document.getElementById('companyIndex').value);
    
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
    
    if (companyIndex === -1) {
        // 新增公司
        // 检查公司编号是否已存在
        if (companies.some(c => c.id === company.id)) {
            showNotification('公司编号已存在', 'error');
            return;
        }
        
        companies.push(company);
        showNotification('公司添加成功');
    } else {
        // 编辑公司
        const originalCompany = filteredCompanies[companyIndex];
        const originalIndex = companies.findIndex(c => c.id === originalCompany.id);
        
        // 检查公司编号是否已被其他公司使用
        if (company.id !== originalCompany.id && companies.some(c => c.id === company.id)) {
            showNotification('公司编号已存在', 'error');
            return;
        }
        
        // 更新公司信息
        companies[originalIndex] = company;
        
        // 同时更新关联的项目中的公司信息
        const projects = getAllProjects();
        projects.forEach(project => {
            if (project.companyId === originalCompany.id) {
                project.companyId = company.id;
            }
        });
        saveProjects(projects);
        
        showNotification('公司更新成功');
    }
    
    saveCompanies(companies);
    
    // 关闭模态框并重置表单
    closeCompanyModalFunc();
    
    // 刷新数据
    loadCompanies();
}

// 双击编辑公司
function editCompanyByDoubleClick(index) {
    // 添加双击反馈效果
    const row = event.currentTarget;
    row.classList.add('bg-blue-100');
    setTimeout(() => {
        row.classList.remove('bg-blue-100');
        openCompanyModal(index);
    }, 200);
}

// 编辑公司（保留原函数以兼容其他调用）
function editCompany(index) {
    editCompanyByDoubleClick(index);
}

// 删除公司
function deleteCompany(index) {
    const company = filteredCompanies[index];
    
    // 检查是否有关联的项目
    const projects = getAllProjects();
    const relatedProjects = projects.filter(project => project.companyId === company.id);
    
    if (relatedProjects.length > 0) {
        showNotification(`无法删除公司"${company.name}"，该公司有 ${relatedProjects.length} 个关联项目`, 'warning');
        return;
    }
    
    if (confirm(`确定要删除公司"${company.name}"吗？此操作不可撤销。`)) {
        const companies = getAllCompanies();
        const originalIndex = companies.findIndex(c => c.id === company.id);
        
        if (originalIndex !== -1) {
            companies.splice(originalIndex, 1);
            saveCompanies(companies);
            
            // 刷新数据
            loadCompanies();
            
            showNotification('公司删除成功');
        }
    }
}

// 搜索公司
function searchCompanies() {
    const searchCompanyName = document.getElementById('searchCompanyName').value.toLowerCase();
    const searchCompanyId = document.getElementById('searchCompanyId').value.toLowerCase();
    
    const companies = getAllCompanies();
    
    filteredCompanies = companies.filter(company => {
        const matchName = !searchCompanyName || company.name.toLowerCase().includes(searchCompanyName);
        const matchId = !searchCompanyId || company.id.toLowerCase().includes(searchCompanyId);
        
        return matchName && matchId;
    });
    
    currentPage = 1;
    renderCompaniesTable();
    updatePagination();
}

// 重置搜索
function resetSearch() {
    document.getElementById('searchCompanyName').value = '';
    document.getElementById('searchCompanyId').value = '';
    
    loadCompanies();
}

// 导出公司数据为CSV
function exportCompaniesToCSV() {
    if (filteredCompanies.length === 0) {
        showNotification('没有数据可导出', 'warning');
        return;
    }
    
    // 获取项目数据，用于计算每个公司关联的项目数和总金额
    const projects = getAllProjects();
    
    // 准备导出数据
    const exportData = filteredCompanies.map(company => {
        const relatedProjects = projects.filter(project => project.companyId === company.id);
        const projectCount = relatedProjects.length;
        const totalProjectAmount = relatedProjects.reduce((sum, project) => sum + (project.totalAmount || 0), 0);
        
        return {
            '公司编号': company.id,
            '公司名称': company.name,
            '关联项目数': projectCount,
            '项目总金额': totalProjectAmount,
            '备注': company.remarks || ''
        };
    });
    
    // 导出文件
    const headers = Object.keys(exportData[0]);
    const filename = `公司数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
    
    exportToCSV(exportData, filename, headers);
}