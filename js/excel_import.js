// Excel导入功能模块

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

// 更新导入进度
function updateImportProgress(progress, text) {
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');
    
    if (progressBar && progressText) {
        progressBar.style.width = progress + '%';
        progressText.textContent = text;
    }
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
    
    // 检查SheetJS库是否加载
    if (typeof XLSX === 'undefined') {
        showNotification('Excel处理库加载失败，请刷新页面重试', 'error');
        closeImportModalFunc();
        return;
    }
    
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
    const projects = getAllProjects(true); // 强制刷新以获取最新数据
    const companies = getAllCompanies();
    const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: []
    };
    
    // 验证并处理每行数据
    jsonData.forEach((row, index) => {
        try {
            const project = validateAndProcessRow(row, companies, index + 2); // +2 因为Excel从第2行开始有数据
            
            if (project) {
                // 检查项目编号是否已存在
                const existingIndex = projects.findIndex(p => p.id === project.id);
                
                if (existingIndex !== -1) {
                    if (importMode === 'replace') {
                        // 替换现有项目
                        projects[existingIndex] = project;
                        results.success++;
                    } else {
                        // 追加模式下跳过已存在的项目
                        results.skipped++;
                        results.errors.push(`第${index + 2}行: 项目编号"${project.id}"已存在，已跳过`);
                    }
                } else {
                    // 新增项目
                    projects.push(project);
                    results.success++;
                }
            }
        } catch (error) {
            results.failed++;
            results.errors.push(`第${index + 2}行: ${error.message}`);
        }
    });
    
    updateImportProgress(90, '正在保存数据...');
    
    // 保存处理后的数据
    if (results.success > 0) {
        saveProjects(projects);
        
        // 记录操作日志
        logOperation('导入Excel数据', 
            `成功: ${results.success}, 失败: ${results.failed}, 跳过: ${results.skipped}`);
        
        // 刷新数据
        setTimeout(() => {
            loadProjects();
            updateImportProgress(100, '导入完成！');
            
            // 显示导入结果
            showImportResult(results);
        }, 500);
    } else {
        updateImportProgress(100, '导入完成，但没有成功导入的数据');
        showImportResult(results);
    }
}

// 验证并处理单行数据
function validateAndProcessRow(row, companies, rowNumber) {
    const errors = [];
    
    // 映射Excel列名到系统字段名
    const fieldMap = {
        '项目编号': 'id',
        '项目名称': 'name',
        '公司名称': 'companyName',
        '甲方负责人': 'clientManager',
        '乙方负责人': 'contractorManager',
        '开始时间': 'startTime',
        '结束时间': 'endTime',
        '质保金结束时间': 'warrantyEndTime',
        '总金额': 'totalAmount',
        '质保金利率(%)': 'warrantyRate',
        '支付金额': 'paidAmount',
        '已申请发票金额': 'invoicedAmount',
        '质保金申请状态': 'warrantyClaimed',
        '备注': 'remarks'
    };
    
    // 转换行数据
    const project = {};
    for (const [excelField, systemField] of Object.entries(fieldMap)) {
        project[systemField] = row[excelField] || '';
    }
    
    // 必填字段验证
    if (!project.id) errors.push('项目编号不能为空');
    if (!project.name) errors.push('项目名称不能为空');
    if (!project.companyName) errors.push('公司名称不能为空');
    if (!project.startTime) errors.push('开始时间不能为空');
    if (!project.endTime) errors.push('结束时间不能为空');
    if (!project.warrantyEndTime) errors.push('质保金结束时间不能为空');
    
    // 金额字段验证
    project.totalAmount = parseFloat(project.totalAmount) || 0;
    if (project.totalAmount <= 0) errors.push('总金额必须大于0');
    
    project.warrantyRate = parseFloat(project.warrantyRate) || 5.0;
    if (project.warrantyRate < 0 || project.warrantyRate > 100) {
        errors.push('质保金利率必须在0-100之间');
    }
    
    project.paidAmount = parseFloat(project.paidAmount) || 0;
    if (project.paidAmount < 0) errors.push('支付金额不能为负数');
    
    project.invoicedAmount = parseFloat(project.invoicedAmount) || 0;
    if (project.invoicedAmount < 0) errors.push('开票金额不能为负数');
    
    // 日期格式验证和转换
    project.startTime = formatExcelDate(project.startTime);
    project.endTime = formatExcelDate(project.endTime);
    project.warrantyEndTime = formatExcelDate(project.warrantyEndTime);
    
    // 日期逻辑验证
    if (new Date(project.endTime) < new Date(project.startTime)) {
        errors.push('结束时间不能早于开始时间');
    }
    
    if (new Date(project.warrantyEndTime) < new Date(project.endTime)) {
        errors.push('质保金结束时间不能早于项目结束时间');
    }
    
    // 金额逻辑验证
    if (project.paidAmount > project.totalAmount) {
        errors.push('支付金额不能超过总金额');
    }
    
    if (project.invoicedAmount > project.totalAmount) {
        errors.push('开票金额不能超过总金额');
    }
    
    // 查找公司ID
    const company = companies.find(c => c.name === project.companyName);
    if (!company) {
        errors.push(`公司"${project.companyName}"不存在`);
    } else {
        project.companyId = company.id;
    }
    
    // 如果有错误，抛出异常
    if (errors.length > 0) {
        throw new Error(errors.join('；'));
    }
    
    // 计算字段
    const warrantyAmount = calculateWarrantyAmount(project.totalAmount, project.warrantyRate);
    
    return {
        id: project.id,
        name: project.name,
        companyId: project.companyId,
        clientManager: project.clientManager || '',
        contractorManager: project.contractorManager || '',
        startTime: project.startTime,
        endTime: project.endTime,
        warrantyEndTime: project.warrantyEndTime,
        totalAmount: project.totalAmount,
        warrantyRate: project.warrantyRate,
        paidAmount: project.paidAmount,
        invoicedAmount: project.invoicedAmount,
        warrantyClaimed: project.warrantyClaimed || '未申请',
        remarks: project.remarks || '',
        
        // 计算字段
        warrantyAmount: warrantyAmount,
        settlementAmount: project.totalAmount - warrantyAmount,
        remainingAmount: project.totalAmount - project.paidAmount,
        completionRate: calculateCompletionRate(project.paidAmount, project.totalAmount),
        
        // 时间戳
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// 格式化Excel日期
function formatExcelDate(dateValue) {
    if (!dateValue) return '';
    
    // 如果是数字，可能是Excel的日期序列号
    if (typeof dateValue === 'number') {
        const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    
    // 如果是字符串，尝试解析
    if (typeof dateValue === 'string') {
        // 处理常见的日期格式
        const formats = [
            /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY-MM-DD 或 YYYY/MM/DD
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/  // MM-DD-YYYY 或 MM/DD/YYYY
        ];
        
        for (const format of formats) {
            const match = dateValue.match(format);
            if (match) {
                let year, month, day;
                if (format === formats[0]) {
                    [, year, month, day] = match;
                } else {
                    [, month, day, year] = match;
                }
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
    }
    
    // 如果是Date对象
    if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
    }
    
    return dateValue.toString().split('T')[0];
}

// 显示导入结果
function showImportResult(results) {
    const modal = document.getElementById('importResultModal');
    const content = document.getElementById('importResultContent');
    
    let html = `
        <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
                <span class="text-lg font-semibold">导入结果</span>
                <span class="text-sm text-gray-600">总共处理: ${results.success + results.failed + results.skipped} 条</span>
            </div>
            <div class="grid grid-cols-3 gap-4 mt-4">
                <div class="bg-green-50 p-3 rounded-lg text-center">
                    <div class="text-green-600 font-bold text-2xl">${results.success}</div>
                    <div class="text-green-800 text-sm">成功</div>
                </div>
                <div class="bg-red-50 p-3 rounded-lg text-center">
                    <div class="text-red-600 font-bold text-2xl">${results.failed}</div>
                    <div class="text-red-800 text-sm">失败</div>
                </div>
                <div class="bg-yellow-50 p-3 rounded-lg text-center">
                    <div class="text-yellow-600 font-bold text-2xl">${results.skipped}</div>
                    <div class="text-yellow-800 text-sm">跳过</div>
                </div>
            </div>
        </div>
    `;
    
    // 显示错误信息
    if (results.errors.length > 0) {
        html += `
            <div class="mt-4">
                <h4 class="text-sm font-semibold text-gray-700 mb-2">错误详情:</h4>
                <div class="bg-gray-50 p-3 rounded-lg max-h-60 overflow-y-auto">
                    <ul class="text-sm text-red-600 space-y-1">
                        ${results.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

// 下载Excel模板
function downloadExcelTemplate() {
    // 创建模板数据
    const templateData = [
        {
            '项目编号': 'XM2024001',
            '项目名称': '示例项目1',
            '公司名称': '示例公司',
            '甲方负责人': '张三',
            '乙方负责人': '李四',
            '开始时间': '2024-01-01',
            '结束时间': '2024-12-31',
            '质保金结束时间': '2025-12-31',
            '总金额': 100000,
            '质保金利率(%)': 5,
            '支付金额': 80000,
            '已申请发票金额': 80000,
            '质保金申请状态': '未申请',
            '备注': '示例项目'
        }
    ];
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData, { skipHeader: false });
    
    // 设置列宽
    const colWidths = [
        { wch: 15 }, // 项目编号
        { wch: 20 }, // 项目名称
        { wch: 20 }, // 公司名称
        { wch: 12 }, // 甲方负责人
        { wch: 12 }, // 乙方负责人
        { wch: 12 }, // 开始时间
        { wch: 12 }, // 结束时间
        { wch: 15 }, // 质保金结束时间
        { wch: 12 }, // 总金额
        { wch: 15 }, // 质保金利率(%)
        { wch: 12 }, // 支付金额
        { wch: 15 }, // 已申请发票金额
        { wch: 12 }, // 质保金申请状态
        { wch: 20 }  // 备注
    ];
    ws['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '项目模板');
    
    // 生成Excel文件并下载
    const filename = `项目导入模板_${new Date().toLocaleDateString('zh-CN')}.xlsx`;
    XLSX.writeFile(wb, filename);
    
    // 记录操作日志
    logOperation('下载Excel模板', filename);
    showNotification('模板下载成功');
}

// 导出到CSV
function exportToCSV(data, filename, headers) {
    if (!data || data.length === 0) {
        showNotification('没有数据可导出', 'warning');
        return;
    }
    
    // 确保headers存在
    if (!headers) {
        headers = Object.keys(data[0]);
    }
    
    // 创建CSV内容
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // 如果值包含逗号、引号或换行符，需要用引号包裹并转义内部引号
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csvContent += values.join(',') + '\n';
    });
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

// 绑定Excel导入相关事件
function bindExcelImportEvents() {
    // 导入Excel按钮
    const importExcelBtn = document.getElementById('importExcelBtn');
    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', openImportModal);
    }
    
    // 关闭导入模态框
    const closeImportModal = document.getElementById('closeImportModal');
    if (closeImportModal) {
        closeImportModal.addEventListener('click', closeImportModalFunc);
    }
    
    // 取消导入按钮
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    if (cancelImportBtn) {
        cancelImportBtn.addEventListener('click', closeImportModalFunc);
    }
    
    // 开始导入按钮
    const startImportBtn = document.getElementById('startImportBtn');
    if (startImportBtn) {
        startImportBtn.addEventListener('click', startImportExcel);
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
        downloadTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }
}