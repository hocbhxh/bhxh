/* --- CONSTANTS & CONFIG --- */
const CONSTANTS = {
    CHUAN_NGHEO: 1500000,
    RATE_BHXH: 0.22,
    MAX_INCOME: 46800000,
    STEP: 50000
};

// --- HELPER FUNCTIONS ---
const Utils = {
    formatCurrency: (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n),
    formatNumber: (n) => new Intl.NumberFormat('vi-VN').format(n),
    removeVietnameseTones: (str) => {
        return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .replace(/\s/g, '%20');
    }
};

// --- APP LOGIC ---
const App = {
    init: function() {
        this.cacheDOM();
        this.bindEvents();
        this.initIncomeOptions();
        this.Settings.load();
    },

    cacheDOM: function() {
        this.dom = {
            settingsModal: document.getElementById('settings-modal'),
            tabs: document.querySelectorAll('.tab-btn'),
            tabPanes: document.querySelectorAll('.tab-pane'),
            resultSection: document.getElementById('result-section'),
            incomeSelect: document.getElementById('income'),
            targetPension: document.getElementById('target-pension'),
            chkPayment: document.getElementById('chk-payment'),
            qrDisplay: document.getElementById('qr-display'),
            
            // Buttons
            btnOpenSettings: document.getElementById('btn-open-settings'),
            btnCloseSettings: document.getElementById('btn-close-settings'),
            btnCloseSettingsIcon: document.getElementById('btn-close-settings-icon'),
            btnSaveSettings: document.getElementById('btn-save-settings'),
            btnCalcForward: document.getElementById('btn-calc-forward'),
            btnCalcReverse: document.getElementById('btn-calc-reverse'),
            btnZalo: document.getElementById('btn-zalo'),
            btnExport: document.getElementById('btn-export'),
            btnInstall: document.getElementById('btn-install-guide'),
            
            // Inputs for Calculation
            inputs: {
                income: document.getElementById('income'),
                supportState: document.getElementById('supportState'),
                supportLocal: document.getElementById('supportLocal'),
                method: document.getElementById('method'),
                gender: document.getElementsByName('gender')
            }
        };
    },

    bindEvents: function() {
        // Modal Events
        this.dom.btnOpenSettings.addEventListener('click', () => this.toggleSettings());
        this.dom.btnCloseSettings.addEventListener('click', () => this.toggleSettings());
        this.dom.btnCloseSettingsIcon.addEventListener('click', () => this.toggleSettings());
        this.dom.btnSaveSettings.addEventListener('click', () => this.Settings.save());

        // Tab Switching
        this.dom.tabs.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        // Calculation Events
        this.dom.btnCalcForward.addEventListener('click', () => this.Calculation.forward());
        this.dom.btnCalcReverse.addEventListener('click', () => this.Calculation.reverse());

        // Input Formatting
        this.dom.targetPension.addEventListener('keyup', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            e.target.value = Utils.formatNumber(val);
        });

        // Payment Checkbox (fix click bubbling on label)
        const paymentToggle = document.querySelector('.payment-toggle');
        paymentToggle.addEventListener('click', (e) => {
            if(e.target.tagName !== 'INPUT') {
                this.dom.chkPayment.checked = !this.dom.chkPayment.checked;
            }
            this.UI.toggleQR();
        });
        this.dom.chkPayment.addEventListener('change', () => this.UI.toggleQR());

        // Export Actions
        this.dom.btnZalo.addEventListener('click', () => this.Export.toZalo());
        this.dom.btnExport.addEventListener('click', () => this.Export.toPDF());
        
        // FAQ Accordion
        document.querySelectorAll('.faq-q').forEach(el => {
            el.addEventListener('click', function() {
                this.parentElement.classList.toggle('open');
            });
        });

        // Install Guide
        this.dom.btnInstall.addEventListener('click', (e) => {
            e.preventDefault();
            alert('iOS: Chọn Chia sẻ -> Thêm vào MH chính.\nAndroid: Chọn Menu -> Cài đặt ứng dụng.');
        });
    },

    toggleSettings: function() {
        const modal = this.dom.settingsModal;
        modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    },

    switchTab: function(e) {
        const targetTab = e.currentTarget.dataset.tab;
        
        this.dom.tabPanes.forEach(el => el.classList.remove('active'));
        this.dom.tabs.forEach(el => el.classList.remove('active'));
        
        document.getElementById('tab-' + targetTab).classList.add('active');
        e.currentTarget.classList.add('active');
        this.dom.resultSection.style.display = 'none';
        
        if(targetTab === 'forward') {
            document.getElementById('notification-area').style.display = 'none';
        }
    },

    initIncomeOptions: function() {
        const fragment = document.createDocumentFragment();
        for (let val = CONSTANTS.CHUAN_NGHEO; val <= CONSTANTS.MAX_INCOME; val += CONSTANTS.STEP) {
            let option = document.createElement('option');
            option.value = val;
            option.textContent = Utils.formatNumber(val);
            fragment.appendChild(option);
        }
        this.dom.incomeSelect.innerHTML = '';
        this.dom.incomeSelect.appendChild(fragment);
    },

    Settings: {
        get: function() {
            return JSON.parse(localStorage.getItem('bhxh_config_final')) || {};
        },
        load: function() {
            const c = this.get();
            if(Object.keys(c).length > 0) {
                if(c.bankCode) document.getElementById('bank-code').value = c.bankCode;
                if(c.bankAcc) document.getElementById('bank-acc').value = c.bankAcc;
                if(c.bankName) document.getElementById('bank-name').value = c.bankName;
                if(c.inflationRate) document.getElementById('inflation-rate').value = c.inflationRate;
                if(c.baseSalary) document.getElementById('base-salary').value = c.baseSalary;
                document.getElementById('interest-rate').value = c.interestRate || "0.31";
                document.getElementById('cfg-months-5y').value = c.months5y || "60";
                document.getElementById('cfg-months-10y').value = c.months10y || "120";
            }
        },
        save: function() {
            const c = {
                bankCode: document.getElementById('bank-code').value,
                bankAcc: document.getElementById('bank-acc').value,
                bankName: document.getElementById('bank-name').value,
                inflationRate: document.getElementById('inflation-rate').value,
                baseSalary: document.getElementById('base-salary').value,
                interestRate: document.getElementById('interest-rate').value,
                months5y: document.getElementById('cfg-months-5y').value,
                months10y: document.getElementById('cfg-months-10y').value
            };
            localStorage.setItem('bhxh_config_final', JSON.stringify(c));
            App.toggleSettings();
            if(App.dom.resultSection.style.display === 'block') {
                App.Calculation.forward();
            }
        }
    },

    Calculation: {
        forward: function() {
            const inputs = App.dom.inputs;
            let income = parseInt(inputs.income.value);
            let supportStatePct = parseFloat(inputs.supportState.value);
            let supportLocalPct = parseFloat(inputs.supportLocal.value);
            
            let methodVal = inputs.method.value;
            let months = 0;
            let mode = 'normal'; 

            if (methodVal === 'opt_5y') {
                months = parseInt(document.getElementById('cfg-months-5y').value) || 60;
                mode = 'discount';
            } else if (methodVal === 'opt_10y') {
                months = parseInt(document.getElementById('cfg-months-10y').value) || 120;
                mode = 'penalty';
            } else {
                months = parseInt(methodVal);
            }

            let inflationRate = parseFloat(document.getElementById('inflation-rate').value);
            let baseSalary = parseFloat(document.getElementById('base-salary').value);
            let interestRateVal = parseFloat(document.getElementById('interest-rate').value) || 0.31;
            let interestRate = interestRateVal / 100;

            App.dom.chkPayment.checked = false;
            App.dom.qrDisplay.style.display = 'none';

            let oneMonthContribution = income * CONSTANTS.RATE_BHXH;
            let baseSupport = CONSTANTS.CHUAN_NGHEO * CONSTANTS.RATE_BHXH;
            let stateAmtOne = baseSupport * (supportStatePct / 100);
            let localAmtOne = baseSupport * (supportLocalPct / 100);
            
            let totalFinal = 0;
            let periodNet = (oneMonthContribution - (stateAmtOne + localAmtOne)) * months;
            let interestVal = 0;

            if (mode === 'discount') {
                let pvContribution = oneMonthContribution * (1 - Math.pow(1 + interestRate, -months)) / interestRate * (1 + interestRate);
                let totalSupport = (stateAmtOne + localAmtOne) * months;
                totalFinal = pvContribution - totalSupport;
                interestVal = periodNet - totalFinal;
                App.UI.showInterest("Giảm trừ lãi (PV)", "-" + Utils.formatCurrency(interestVal), "val-green", "#e8f5e9", "#2e7d32", 
                    `<div><i class="fas fa-piggy-bank"></i> Bạn tiết kiệm được <strong>${Utils.formatCurrency(interestVal)}</strong> khi đóng 1 lần ${months} tháng.</div>`);
            } else if (mode === 'penalty') {
                let fvNet = (oneMonthContribution - (stateAmtOne + localAmtOne)) * (Math.pow(1 + interestRate, months) - 1) / interestRate * (1 + interestRate);
                totalFinal = fvNet;
                interestVal = totalFinal - periodNet;
                App.UI.showInterest("Lãi cộng thêm (FV)", "+" + Utils.formatCurrency(interestVal), "val-red", "#fff3e0", "#e65100", 
                    `<div><i class="fas fa-exclamation-triangle"></i> Đóng bù ${months} tháng chịu thêm <strong>${Utils.formatCurrency(interestVal)}</strong> lãi.</div>`);
            } else {
                totalFinal = periodNet;
                App.UI.hideInterest();
            }

            document.getElementById('res-monthly').innerText = Utils.formatCurrency(oneMonthContribution * months);
            document.getElementById('res-support-state').innerText = "-" + Utils.formatCurrency(stateAmtOne * months);
            document.getElementById('res-support-local').innerText = "-" + Utils.formatCurrency(localAmtOne * months);
            document.getElementById('res-total').innerText = Utils.formatCurrency(totalFinal);

            let pensionBase = income * inflationRate;
            let pensionAmtMale = pensionBase * 0.45;
            let pensionAmtFemale = pensionBase * 0.55;

            document.getElementById('ben-pension').innerText = "~" + Utils.formatCurrency(pensionAmtMale);
            document.getElementById('ben-pension-female').innerText = "~" + Utils.formatCurrency(pensionAmtFemale);
            document.getElementById('ben-funeral').innerText = Utils.formatCurrency(baseSalary * 10);

            App.UI.renderSchedule(months, totalFinal);
            App.UI.prepareQR(totalFinal);
            App.UI.showResultSection();
        },

        reverse: function() {
            let targetRaw = App.dom.targetPension.value.replace(/\./g, '');
            let target = parseInt(targetRaw);
            if (!target || target < 500000) { alert("Vui lòng nhập mức lương hưu hợp lý!"); return; }

            let gender = document.querySelector('input[name="gender"]:checked').value;
            let inflation = parseFloat(document.getElementById('inflation-rate').value) || 1.5055;
            let rate = gender === 'male' ? 0.45 : 0.55;

            let requiredIncome = target / (inflation * rate);
            let roundedIncome = Math.ceil(requiredIncome / CONSTANTS.STEP) * CONSTANTS.STEP;

            if (roundedIncome < CONSTANTS.CHUAN_NGHEO) roundedIncome = CONSTANTS.CHUAN_NGHEO;
            if (roundedIncome > CONSTANTS.MAX_INCOME) roundedIncome = CONSTANTS.MAX_INCOME;

            App.dom.incomeSelect.value = roundedIncome;
            if (App.dom.incomeSelect.value != roundedIncome) {
                App.dom.incomeSelect.value = roundedIncome > CONSTANTS.MAX_INCOME ? CONSTANTS.MAX_INCOME : CONSTANTS.CHUAN_NGHEO;
            }

            document.querySelector('[data-tab="forward"]').click();
            this.forward();

            const notiBox = document.getElementById('notification-area');
            notiBox.style.display = 'block';
            notiBox.innerHTML = `<div><i class="fas fa-check-circle"></i> Mục tiêu: <strong>${App.dom.targetPension.value}đ</strong> <br> 👉 Đề xuất mức thu nhập: <strong>${Utils.formatCurrency(roundedIncome)}</strong></div>`;
        }
    },

    UI: {
        showResultSection: function() {
            App.dom.resultSection.style.display = 'block';
            App.dom.resultSection.scrollIntoView({behavior: 'smooth'});
        },
        showInterest: function(label, value, colorClass, bgColor, textColor, boxContent) {
            const row = document.getElementById('row-interest');
            row.style.display = 'flex';
            row.children[0].innerText = label;
            const valEl = document.getElementById('res-interest');
            valEl.innerText = value; valEl.className = "result-val " + colorClass;

            const box = document.getElementById('comparison-box');
            box.style.display = 'block'; box.style.background = bgColor;
            box.style.color = textColor; box.style.borderColor = textColor;
            box.innerHTML = boxContent;
        },
        hideInterest: function() {
            document.getElementById('row-interest').style.display = 'none';
            document.getElementById('comparison-box').style.display = 'none';
        },
        renderSchedule: function(months, amount) {
            const ul = document.getElementById('schedule-list');
            const box = document.getElementById('schedule-box');
            box.style.display = 'block'; ul.innerHTML = '';
            if (months >= 60) {
                ul.innerHTML = `<li>Lần này: <strong>${Utils.formatCurrency(amount)}</strong></li><li>Lần sau: ...</li>`;
                return;
            }
            let date = new Date();
            for(let i=0; i<3; i++) {
                let str = i===0 ? "Ngay bây giờ" : date.toLocaleDateString('vi-VN');
                ul.innerHTML += `<li style="padding:5px 0; border-bottom:1px dotted #ccc; display:flex; justify-content:space-between;"><span>Kỳ ${i+1} (${str})</span> <strong>${Utils.formatCurrency(amount)}</strong></li>`;
                date.setMonth(date.getMonth() + months);
            }
        },
        prepareQR: function(amount) {
            const config = App.Settings.get();
            if(config && config.bankAcc) {
                const name = document.getElementById('customer-name').innerText;
                const content = "BHXH " + Utils.removeVietnameseTones(name).substring(0,15);
                const url = `https://img.vietqr.io/image/${config.bankCode}-${config.bankAcc}-compact2.png?amount=${Math.round(amount)}&addInfo=${content}&accountName=${config.bankName}`;
                document.getElementById('qr-img').src = url;
                document.getElementById('bank-info').innerText = `${config.bankName} - ${config.bankAcc}`;
            }
        },
        toggleQR: function() {
            const chk = App.dom.chkPayment;
            const qr = App.dom.qrDisplay;
            const config = App.Settings.get();
            if(chk.checked) {
                if(!config || !config.bankAcc) {
                    alert("Vui lòng vào Cài đặt (Bánh răng) để cấu hình ngân hàng trước!");
                    chk.checked = false; App.toggleSettings();
                } else { qr.style.display = 'block'; qr.scrollIntoView({behavior:'smooth'}); }
            } else { qr.style.display = 'none'; }
        }
    },

    Export: {
        toZalo: function() {
            const income = document.getElementById('income');
            const method = document.getElementById('method');
            const txt = `📋 *BHXH TỰ NGUYỆN*\n👤 Khách: ${document.getElementById('customer-name').innerText}\n💰 Thu nhập làm căn cứ đóng: ${income.options[income.selectedIndex].text} VNĐ\n📅 Phương thức đóng: ${method.options[method.selectedIndex].text}\n👉 *SỐ TIỀN ĐÓNG: ${document.getElementById('res-total').innerText}*\n📞 Tư vấn: ${document.getElementById('consultant-name').innerText} - ${document.getElementById('consultant-phone').innerText}`;
            navigator.clipboard.writeText(txt).then(() => {
                const btn = App.dom.btnZalo;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Đã copy';
                setTimeout(() => { btn.innerHTML = originalText; }, 2000);
            });
        },
        
        toPDF: async function() {
            const btn = App.dom.btnExport;
            btn.innerText = "Đang xử lý..."; btn.disabled = true;

            try {
                // 1. LẤY DỮ LIỆU TỪ MÀN HÌNH CHÍNH
                const name = document.getElementById('customer-name').innerText;
                const incomeSelect = document.getElementById('income');
                const incomeText = incomeSelect.options[incomeSelect.selectedIndex].text;
                const methodSelect = document.getElementById('method');
                const methodText = methodSelect.options[methodSelect.selectedIndex].text;
                
                const monthly = document.getElementById('res-monthly').innerText;
                const supportState = document.getElementById('res-support-state').innerText;
                const supportLocal = document.getElementById('res-support-local').innerText;
                const total = document.getElementById('res-total').innerText;
                
                const consultantName = document.getElementById('consultant-name').innerText;
                const consultantPhone = document.getElementById('consultant-phone').innerText;

                // 2. ĐIỀN DỮ LIỆU VÀO MẪU IN (TEMPLATE)
                document.getElementById('pdf-name').innerText = name;
                document.getElementById('pdf-income').innerText = incomeText + " VNĐ";
                document.getElementById('pdf-method').innerText = methodText;
                document.getElementById('pdf-monthly').innerText = monthly;
                document.getElementById('pdf-support-state').innerText = supportState; // Giữ nguyên dấu trừ nếu có
                document.getElementById('pdf-support-local').innerText = supportLocal;
                document.getElementById('pdf-total').innerText = total;
                document.getElementById('pdf-consultant').innerText = `${consultantName} – ${consultantPhone}`;

                // 3. XỬ LÝ LỊCH ĐÓNG (Lấy từ danh sách ul li trên màn hình chính)
                const scheduleListUl = document.getElementById('schedule-list');
                const scheduleContainer = document.getElementById('pdf-schedule-container');
                scheduleContainer.innerHTML = ''; // Xóa cũ

                if (scheduleListUl && scheduleListUl.children.length > 0) {
                    Array.from(scheduleListUl.children).forEach(li => {
                        // Tách text từ li (ví dụ: "Kỳ 1 (Ngay bây giờ) 1.000.000 đ")
                        // Ta sẽ format lại cho giống word: + Nội dung
                        const spans = li.querySelectorAll('span');
                        const strong = li.querySelector('strong');
                        
                        let textTime = "";
                        let textMoney = "";
                        
                        if(spans.length > 0) textTime = spans[0].innerText; // Kỳ 1...
                        else textTime = li.innerText.split('strong')[0]; // Fallback
                        
                        if(strong) textMoney = strong.innerText;

                        const div = document.createElement('div');
                        div.style.marginBottom = "5px";
                        // Format: + Kỳ 1 (Ngay bây giờ): Số tiền đ
                        div.innerText = `+ ${textTime}: ${textMoney}`;
                        scheduleContainer.appendChild(div);
                    });
                } else {
                    scheduleContainer.innerHTML = "<div>(Chưa có lịch đóng chi tiết)</div>";
                }

                // 4. CHỤP ẢNH TEMPLATE VÀ XUẤT PDF
                const element = document.getElementById("pdf-export-template");
                
                // Sử dụng html2canvas để chụp div ẩn
                const canvas = await html2canvas(element, { 
                    scale: 2, // Tăng độ nét
                    useCORS: true,
                    windowWidth: 800
                });

                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                // Tính chiều cao ảnh giữ nguyên tỷ lệ
                const imgProps = pdf.getImageProperties(imgData);
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                pdf.addImage(imgData, 'JPEG', 0, 10, pdfWidth, pdfHeight); // Cách top 10mm
                
                // Tạo tên file: BHXH_[Tên khách].pdf
                const cleanName = Utils.removeVietnameseTones(name).replace(/\s+/g, '_');
                pdf.save(`BHXH_${cleanName}.pdf`);

            } catch (error) {
                console.error(error);
                alert("Có lỗi khi xuất PDF: " + error.message);
            } finally {
                btn.innerHTML = '<i class="fas fa-file-pdf"></i> Xuất PDF'; 
                btn.disabled = false;
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });