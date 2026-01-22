
    /* ==========================================================================
       1. CẤU HÌNH VÀ HẰNG SỐ (CONSTANTS)
       Đây là nơi quy định các con số cố định theo luật BHXH hiện hành.
       Nếu luật thay đổi (ví dụ chuẩn nghèo tăng), bạn sửa ở đây.
       ========================================================================== */
    const CONSTANTS = {
        CHUAN_NGHEO: 1500000,   // Mức chuẩn nghèo khu vực nông thôn (đang dùng để tính mức hỗ trợ)
        RATE_BHXH: 0.22,        // Tỷ lệ đóng BHXH (22%)
        MAX_INCOME: 46800000,   // Mức thu nhập trần (20 lần lương cơ sở: 2.340.000 * 20)
        STEP: 50000             // Bước nhảy của số tiền khi tạo danh sách thu nhập (50.000đ)
    };

    /* ==========================================================================
       2. CÁC HÀM TIỆN ÍCH (HELPER FUNCTIONS)
       Các hàm nhỏ dùng chung cho cả ứng dụng để xử lý văn bản, số liệu.
       ========================================================================== */
    const Utils = {
        // Định dạng số thành tiền tệ (Ví dụ: 1000000 -> 1.000.000 đ)
        formatCurrency: (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n),
        
        // Định dạng số thông thường (Ví dụ: 1000 -> 1.000)
        formatNumber: (n) => new Intl.NumberFormat('vi-VN').format(n),
        
        // Xóa dấu tiếng Việt (Dùng để tạo nội dung chuyển khoản ngân hàng không dấu)
        removeVietnameseTones: (str) => {
            return str.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/đ/g, 'd').replace(/Đ/g, 'D')
                .replace(/\s/g, '%20'); // Thay khoảng trắng bằng %20 cho URL
        }
    };

    /* ==========================================================================
       3. LOGIC CHÍNH CỦA ỨNG DỤNG (APP)
       Bao gồm khởi tạo, xử lý sự kiện, tính toán và xuất file.
       ========================================================================== */
    const App = {
        // Hàm chạy đầu tiên khi web tải xong
        init: function() {
            this.cacheDOM();        // Lưu các phần tử HTML vào biến để dùng lại (tối ưu tốc độ)
            this.bindEvents();      // Gắn sự kiện click, change cho các nút bấm
            this.initIncomeOptions(); // Tạo danh sách chọn mức thu nhập
            this.Settings.load();   // Tải cấu hình đã lưu từ lần trước
            this.Stats.init(); // Gọi hàm đếm số lượt truy cập khi khởi chạy
        },

        // Lưu các phần tử HTML vào bộ nhớ
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
                
                // Các nút bấm
                btnOpenSettings: document.getElementById('btn-open-settings'),
                btnCloseSettings: document.getElementById('btn-close-settings'),
                btnCloseSettingsIcon: document.getElementById('btn-close-settings-icon'),
                btnSaveSettings: document.getElementById('btn-save-settings'),
                btnCalcForward: document.getElementById('btn-calc-forward'), // Nút Tính mức đóng
                btnCalcReverse: document.getElementById('btn-calc-reverse'), // Nút Tính mục tiêu
                btnZalo: document.getElementById('btn-zalo'),
                btnExport: document.getElementById('btn-export'),
                btnInstall: document.getElementById('btn-install-guide'),
                
                // Các ô nhập liệu dùng để tính toán
                inputs: {
                    income: document.getElementById('income'),
                    supportState: document.getElementById('supportState'),
                    supportLocal: document.getElementById('supportLocal'),
                    method: document.getElementById('method'),
                    gender: document.getElementsByName('gender')
                }
            };
        },

        // Gán hành động cho các nút (Click làm gì, Change làm gì...)
        bindEvents: function() {
            // Sự kiện Modal Cài đặt
            this.dom.btnOpenSettings.addEventListener('click', () => this.toggleSettings());
            this.dom.btnCloseSettings.addEventListener('click', () => this.toggleSettings());
            this.dom.btnCloseSettingsIcon.addEventListener('click', () => this.toggleSettings());
            this.dom.btnSaveSettings.addEventListener('click', () => this.Settings.save());

            // Chuyển Tab (Tính mức đóng <-> Tính mục tiêu)
            this.dom.tabs.forEach(btn => {
                btn.addEventListener('click', (e) => this.switchTab(e));
            });

            // Sự kiện bấm nút Tính toán
            this.dom.btnCalcForward.addEventListener('click', () => this.Calculation.forward());
            this.dom.btnCalcReverse.addEventListener('click', () => this.Calculation.reverse());

            // Tự động định dạng số khi nhập lương hưu mong muốn (thêm dấu chấm phân cách)
            this.dom.targetPension.addEventListener('keyup', (e) => {
                let val = e.target.value.replace(/\D/g, ''); // Chỉ lấy số
                e.target.value = Utils.formatNumber(val);
            });

            // Bật/Tắt hiện mã QR
            const paymentToggle = document.querySelector('.payment-toggle');
            paymentToggle.addEventListener('click', (e) => {
                if(e.target.tagName !== 'INPUT') {
                    this.dom.chkPayment.checked = !this.dom.chkPayment.checked;
                }
                this.UI.toggleQR();
            });
            this.dom.chkPayment.addEventListener('change', () => this.UI.toggleQR());

            // Các nút Xuất file / Copy
            this.dom.btnZalo.addEventListener('click', () => this.Export.toZalo());
            this.dom.btnExport.addEventListener('click', () => this.Export.toPDF());
            
            // Hiệu ứng đóng mở câu hỏi thường gặp (Accordion)
            document.querySelectorAll('.faq-q').forEach(el => {
                el.addEventListener('click', function() {
                    this.parentElement.classList.toggle('open');
                });
            });

            // Nút hướng dẫn cài đặt
            this.dom.btnInstall.addEventListener('click', (e) => {
                e.preventDefault();
                alert('iOS: Chọn Chia sẻ -> Thêm vào MH chính.\nAndroid: Chọn Menu -> Cài đặt ứng dụng.');
            });
        },

        // Hàm ẩn/hiện bảng Cài đặt
        toggleSettings: function() {
            const modal = this.dom.settingsModal;
            modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        },

        // Hàm xử lý chuyển Tab
        switchTab: function(e) {
            const targetTab = e.currentTarget.dataset.tab;
            
            this.dom.tabPanes.forEach(el => el.classList.remove('active'));
            this.dom.tabs.forEach(el => el.classList.remove('active'));
            
            document.getElementById('tab-' + targetTab).classList.add('active');
            e.currentTarget.classList.add('active');
            this.dom.resultSection.style.display = 'none'; // Ẩn kết quả cũ khi chuyển tab
            
            if(targetTab === 'forward') {
                document.getElementById('notification-area').style.display = 'none';
            }
        },

        // Tạo danh sách chọn thu nhập từ Chuẩn nghèo đến Max (bước nhảy 50k)
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

        /* --- QUẢN LÝ CẤU HÌNH (SETTINGS) ---
           Sử dụng LocalStorage của trình duyệt để lưu thông tin ngân hàng, lãi suất...
           Giúp người dùng không phải nhập lại mỗi lần tải lại trang.
        */
        Settings: {
            get: function() {
                return JSON.parse(localStorage.getItem('bhxh_config_final_v3')) || {};
            },
            load: function() {
                const c = this.get();
                // Điền dữ liệu đã lưu vào các ô input trong Modal
                if(c.bankCode) document.getElementById('bank-code').value = c.bankCode;
                if(c.bankAcc) document.getElementById('bank-acc').value = c.bankAcc;
                if(c.bankName) document.getElementById('bank-name').value = c.bankName;
                if(c.inflationRate) document.getElementById('inflation-rate').value = c.inflationRate;
                if(c.baseSalary) document.getElementById('base-salary').value = c.baseSalary;
                
                // Lãi suất mặc định 0.31% (theo file Excel 2026)
                document.getElementById('interest-rate').value = c.interestRate || "0.31";
                
                // Số tháng gói 5 năm (Lấy giá trị cũ hoặc mặc định 60)
                document.getElementById('cfg-months-5y').value = c.months5y || "60";
                
                // Số tháng gói 10 năm (Đóng bù)
                document.getElementById('cfg-months-10y').value = c.months10y || "60";
            },
            save: function() {
                // Lưu dữ liệu từ Modal vào LocalStorage
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
                localStorage.setItem('bhxh_config_final_v3', JSON.stringify(c));
                App.toggleSettings(); // Đóng modal
                // Nếu đang hiển thị kết quả thì tính lại ngay với thông số mới
                if(App.dom.resultSection.style.display === 'block') {
                    App.Calculation.forward();
                }
            }
        },

        /* --- TÍNH TOÁN (CALCULATION) - PHẦN QUAN TRỌNG NHẤT --- */
        Calculation: {
            // Hàm tính xuôi: Từ Thu nhập -> Ra số tiền đóng
            forward: function() {
                const inputs = App.dom.inputs;
                
                // 1. Lấy dữ liệu đầu vào
                let income = parseInt(inputs.income.value); // Mức thu nhập chọn
                let supportStatePct = parseFloat(inputs.supportState.value); // % Ngân sách nhà nước hỗ trợ
                let supportLocalPct = parseFloat(inputs.supportLocal.value); // % Địa phương hỗ trợ
                
                let methodVal = inputs.method.value; // Phương thức đóng (1, 3, 6, 12, 5y, 10y)
                let months = 0; // Số tháng đóng
                let mode = 'normal'; // Chế độ tính: 'normal' (thường), 'discount' (giảm lãi), 'penalty' (phạt lãi)

                // Xác định số tháng và chế độ dựa trên phương thức đóng
                if (methodVal === 'opt_5y') {
                    // Lấy số tháng từ dropdown cấu hình (24, 36, 48, 60)
                    months = parseInt(document.getElementById('cfg-months-5y').value) || 60;
                    mode = 'discount'; // Đóng trước -> Tính PV
                } else if (methodVal === 'opt_10y') {
                    months = parseInt(document.getElementById('cfg-months-10y').value) || 120;
                    mode = 'penalty'; // Đóng bù -> Tính FV
                } else {
                    months = parseInt(methodVal); // Các gói thường 1, 3, 6, 12
                }

                // Lấy các tham số kinh tế từ cấu hình
                let inflationRate = parseFloat(document.getElementById('inflation-rate').value);
                let baseSalary = parseFloat(document.getElementById('base-salary').value);
                let interestRateVal = parseFloat(document.getElementById('interest-rate').value);
                let interestRate = interestRateVal / 100; // Đổi % ra số thập phân (0.31% -> 0.0031)

                // Reset giao diện thanh toán
                App.dom.chkPayment.checked = false;
                App.dom.qrDisplay.style.display = 'none';

                // --- BẮT ĐẦU TÍNH TOÁN CƠ BẢN ---
                
                // A. Mức đóng BHXH hàng tháng (Chưa trừ hỗ trợ) = Thu nhập * 22%
                let oneMonthContribution = income * CONSTANTS.RATE_BHXH;
                
                // B. Tính tiền hỗ trợ hàng tháng (Dựa trên Chuẩn nghèo)
                let baseSupport = CONSTANTS.CHUAN_NGHEO * CONSTANTS.RATE_BHXH; // Mức đóng chuẩn nghèo (330.000đ)
                let stateAmtOne = baseSupport * (supportStatePct / 100); // Tiền NSNN hỗ trợ 1 tháng
                let localAmtOne = baseSupport * (supportLocalPct / 100); // Tiền Địa phương hỗ trợ 1 tháng
                
                // C. Mức người dân phải đóng 1 tháng (nếu không có lãi suất)
                let netMonthPayment = oneMonthContribution - stateAmtOne - localAmtOne;

                let totalFinal = 0; // Số tiền cuối cùng phải đóng
                let periodNet = netMonthPayment * months; // Tổng gốc (Tiền đóng 1 tháng * số tháng)
                let interestVal = 0; // Giá trị lãi (Dương là phải đóng thêm, Âm là được giảm)

                // --- XỬ LÝ CÁC GÓI ĐẶC BIỆT ---

                if (mode === 'discount') {
                    // === GÓI ĐÓNG TRƯỚC (VÍ DỤ 5 NĂM) ===
                    // Áp dụng công thức PV (Present Value - Hiện giá) cho dòng tiền đều đầu kỳ (Annuity Due)
                    // Công thức: PV = Pmt * [(1 - (1 + r)^-n) / r] * (1 + r)
                    
                    // Tính hệ số PV
                    let pvFactor = (1 - Math.pow(1 + interestRate, -months)) / interestRate * (1 + interestRate);
                    
                    // Tính PV trên số tiền TỔNG ĐÓNG (Chưa trừ hỗ trợ) - Sửa theo Excel
                    let pvTotalContribution = oneMonthContribution * pvFactor;

                    // Tổng tiền hỗ trợ (Cố định, không được tính lãi, trừ thẳng)
                    let totalSupport = (stateAmtOne + localAmtOne) * months;

                    // Số tiền người dân đóng = PV(Tiền đóng) - Tổng hỗ trợ
                    totalFinal = pvTotalContribution - totalSupport;
                    
                    // Tính số tiền tiết kiệm được so với đóng từng tháng
                    interestVal = periodNet - totalFinal;
                    
                    // Hiển thị thông báo lãi
                    App.UI.showInterest("Giảm trừ lãi (PV)", "-" + Utils.formatCurrency(interestVal), "val-green", "#e8f5e9", "#2e7d32", 
                        `<div><i class="fas fa-piggy-bank"></i> Bạn tiết kiệm được <strong>${Utils.formatCurrency(interestVal)}</strong> khi đóng trước ${months} tháng.</div>`);
                
                } else if (mode === 'penalty') {
                    // === GÓI ĐÓNG BÙ (VÍ DỤ 10 NĂM) ===
                    // Áp dụng công thức FV (Future Value - Tương lai) cho dòng tiền đều đầu kỳ
                    // Công thức: FV = Pmt * [((1 + r)^n - 1) / r] * (1 + r)
                    
                    // Tính hệ số FV
                    let fvFactor = (Math.pow(1 + interestRate, months) - 1) / interestRate * (1 + interestRate);
                    
                    // Tính FV trên TOÀN BỘ số tiền đóng BHXH (Chưa trừ hỗ trợ) - Sửa theo Excel
                    let fvTotalContribution = oneMonthContribution * fvFactor;

                    // Tổng tiền hỗ trợ (Trừ thẳng, không tính lãi)
                    let totalSupport = (stateAmtOne + localAmtOne) * months;
                    
                    // Số tiền người dân đóng = FV(Tiền đóng) - Tổng hỗ trợ
                    totalFinal = fvTotalContribution - totalSupport;

                    // Tính số tiền bị phạt thêm (Lãi)
                    interestVal = totalFinal - periodNet;
                    
                    // Hiển thị thông báo lãi
                    App.UI.showInterest("Lãi cộng thêm (FV)", "+" + Utils.formatCurrency(interestVal), "val-red", "#fff3e0", "#e65100", 
                        `<div><i class="fas fa-exclamation-triangle"></i> Đóng bù ${months} tháng chịu thêm <strong>${Utils.formatCurrency(interestVal)}</strong> lãi.</div>`);
                } else {
                    // === GÓI THƯỜNG (1, 3, 6, 12 THÁNG) ===
                    // Chỉ nhân đều, không tính lãi
                    totalFinal = periodNet;
                    App.UI.hideInterest();
                }

                // --- HIỂN THỊ KẾT QUẢ LÊN MÀN HÌNH ---
                document.getElementById('res-monthly').innerText = Utils.formatCurrency(oneMonthContribution * months);
                document.getElementById('res-support-state').innerText = "-" + Utils.formatCurrency(stateAmtOne * months);
                document.getElementById('res-support-local').innerText = "-" + Utils.formatCurrency(localAmtOne * months);
                
                // Làm tròn đến đơn vị đồng cho số tiền cuối cùng
                document.getElementById('res-total').innerText = Utils.formatCurrency(Math.round(totalFinal));

                // Tính quyền lợi hưởng (Lương hưu, Mai táng phí)
                // Công thức ước tính đơn giản: Lương hưu = Thu nhập * Hệ số trượt giá * Tỷ lệ hưởng (45% - 75%)
                let pensionBase = income * inflationRate;
                let pensionAmtMale = pensionBase * 0.40;   // Nam đóng 15 năm khởi điểm 40%
                let pensionAmtFemale = pensionBase * 0.45; // Nữ khởi điểm ước tính cao hơn do lộ trình
                // Lưu ý: Đây là con số ước tính để tham khảo, thực tế phụ thuộc nhiều yếu tố.

                document.getElementById('ben-pension').innerText = "~" + Utils.formatCurrency(pensionAmtMale);
                document.getElementById('ben-pension-female').innerText = "~" + Utils.formatCurrency(pensionAmtFemale);
                document.getElementById('ben-funeral').innerText = Utils.formatCurrency(baseSalary * 10); // Mai táng phí = 10 lần lương cơ sở

                // Vẽ lịch đóng và chuẩn bị mã QR
                App.UI.renderSchedule(months, totalFinal);
                App.UI.prepareQR(totalFinal);
                App.UI.showResultSection();
            },

            // Hàm tính ngược: Từ Lương hưu mong muốn -> Ra mức thu nhập cần chọn
            reverse: function() {
                let targetRaw = App.dom.targetPension.value.replace(/\./g, '');
                let target = parseInt(targetRaw);
                if (!target || target < 500000) { alert("Vui lòng nhập mức lương hưu hợp lý!"); return; }

                let gender = document.querySelector('input[name="gender"]:checked').value;
                let inflation = parseFloat(document.getElementById('inflation-rate').value) || 1.3;
                let rate = gender === 'male' ? 0.40 : 0.45;

                // Công thức ngược: Thu nhập cần = Lương hưu / (Hệ số trượt giá * Tỷ lệ hưởng)
                let requiredIncome = target / (inflation * rate);
                
                // Làm tròn lên theo bước nhảy (STEP = 50.000)
                let roundedIncome = Math.ceil(requiredIncome / CONSTANTS.STEP) * CONSTANTS.STEP;

                // Kiểm tra giới hạn Min/Max
                if (roundedIncome < CONSTANTS.CHUAN_NGHEO) roundedIncome = CONSTANTS.CHUAN_NGHEO;
                if (roundedIncome > CONSTANTS.MAX_INCOME) roundedIncome = CONSTANTS.MAX_INCOME;

                // Tự động chọn mức thu nhập trong dropdown
                App.dom.incomeSelect.value = roundedIncome;
                // Nếu giá trị làm tròn không khớp option nào (ít xảy ra do dùng STEP), chọn biên gần nhất
                if (App.dom.incomeSelect.value != roundedIncome) {
                    App.dom.incomeSelect.value = roundedIncome > CONSTANTS.MAX_INCOME ? CONSTANTS.MAX_INCOME : CONSTANTS.CHUAN_NGHEO;
                }

                // Chuyển sang tab Tính mức đóng và tự động bấm nút Tính
                document.querySelector('[data-tab="forward"]').click();
                this.forward();

                // Hiện thông báo gợi ý
                const notiBox = document.getElementById('notification-area');
                notiBox.style.display = 'block';
                notiBox.innerHTML = `<div><i class="fas fa-check-circle"></i> Mục tiêu: <strong>${App.dom.targetPension.value}đ</strong> <br> 👉 Đề xuất mức thu nhập: <strong>${Utils.formatCurrency(roundedIncome)}</strong></div>`;
            }
        },

        /* --- XỬ LÝ GIAO DIỆN (UI) --- */
        UI: {
            // Hiện vùng kết quả và cuộn xuống
            showResultSection: function() {
                App.dom.resultSection.style.display = 'block';
                App.dom.resultSection.scrollIntoView({behavior: 'smooth'});
            },
            // Hiện dòng thông báo lãi suất (PV/FV)
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
            // Ẩn dòng lãi suất (khi chọn gói thường)
            hideInterest: function() {
                document.getElementById('row-interest').style.display = 'none';
                document.getElementById('comparison-box').style.display = 'none';
            },
            // Hiển thị lịch đóng tiền
            renderSchedule: function(months, amount) {
                const ul = document.getElementById('schedule-list');
                const box = document.getElementById('schedule-box');
                box.style.display = 'block'; ul.innerHTML = '';
                
                // Nếu đóng gói dài hạn (> 24 tháng), chỉ hiện lần này
                if (months >= 24) { 
                    ul.innerHTML = `<li>Lần này: <strong>${Utils.formatCurrency(amount)}</strong></li><li>Lần sau: ... (Tùy chọn gia hạn)</li>`;
                    return;
                }
                
                // Nếu đóng ngắn hạn, dự tính 3 kỳ tiếp theo
                let date = new Date();
                for(let i=0; i<3; i++) {
                    let str = i===0 ? "Ngay bây giờ" : date.toLocaleDateString('vi-VN');
                    ul.innerHTML += `<li style="padding:5px 0; border-bottom:1px dotted #ccc; display:flex; justify-content:space-between;"><span>Kỳ ${i+1} (${str})</span> <strong>${Utils.formatCurrency(amount)}</strong></li>`;
                    date.setMonth(date.getMonth() + months); // Cộng thêm số tháng cho kỳ sau
                }
            },
            // Tạo link ảnh QR Code VietQR
            prepareQR: function(amount) {
                const config = App.Settings.get();
                if(config && config.bankAcc) {
                    const name = document.getElementById('customer-name').innerText;
                    // Nội dung CK: BHXH + Tên khách không dấu (tối đa 15 ký tự)
                    const content = "BHXH " + Utils.removeVietnameseTones(name).substring(0,15);
                    const url = `https://img.vietqr.io/image/${config.bankCode}-${config.bankAcc}-compact2.png?amount=${Math.round(amount)}&addInfo=${content}&accountName=${config.bankName}`;
                    document.getElementById('qr-img').src = url;
                    document.getElementById('bank-info').innerText = `${config.bankName} - ${config.bankAcc}`;
                }
            },
            // Ẩn/Hiện vùng QR khi tích chọn checkbox
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

        /* --- XUẤT DỮ LIỆU (EXPORT) --- */
        Export: {
            // Copy nội dung text để gửi Zalo
            toZalo: function() {
                const income = document.getElementById('income');
                const method = document.getElementById('method');
                // Tạo nội dung text
                const txt = `📋 *BHXH TỰ NGUYỆN*\n👤 Khách: ${document.getElementById('customer-name').innerText}\n💰 Thu nhập làm căn cứ đóng: ${income.options[income.selectedIndex].text} VNĐ\n📅 Phương thức đóng: ${method.options[method.selectedIndex].text}\n👉 *SỐ TIỀN ĐÓNG: ${document.getElementById('res-total').innerText}*\n📞 Tư vấn: ${document.getElementById('consultant-name').innerText} - ${document.getElementById('consultant-phone').innerText}`;
                
                // Copy vào clipboard
                navigator.clipboard.writeText(txt).then(() => {
                    const btn = App.dom.btnZalo;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i> Đã copy';
                    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                });
            },
            
            // Xuất file PDF (Dùng html2canvas chụp ảnh + jspdf tạo file)
            toPDF: async function() {
                const btn = App.dom.btnExport;
                btn.innerText = "Đang xử lý..."; btn.disabled = true;
                try {
                    // 1. Lấy dữ liệu từ màn hình chính
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

                    // 2. Điền vào mẫu in ẩn (Template)
                    document.getElementById('pdf-name').innerText = name;
                    document.getElementById('pdf-income').innerText = incomeText + " VNĐ";
                    document.getElementById('pdf-method').innerText = methodText;
                    document.getElementById('pdf-monthly').innerText = monthly;
                    document.getElementById('pdf-support-state').innerText = supportState;
                    document.getElementById('pdf-support-local').innerText = supportLocal;
                    document.getElementById('pdf-total').innerText = total;
                    document.getElementById('pdf-consultant').innerText = `${consultantName} – ${consultantPhone}`;

                    // 3. Tạo danh sách lịch đóng trong PDF
                    const scheduleListUl = document.getElementById('schedule-list');
                    const scheduleContainer = document.getElementById('pdf-schedule-container');
                    scheduleContainer.innerHTML = ''; 

                    if (scheduleListUl && scheduleListUl.children.length > 0) {
                        Array.from(scheduleListUl.children).forEach(li => {
                            const spans = li.querySelectorAll('span');
                            const strong = li.querySelector('strong');
                            let textTime = spans.length > 0 ? spans[0].innerText : li.innerText.split('strong')[0];
                            let textMoney = strong ? strong.innerText : "";
                            const div = document.createElement('div');
                            div.style.marginBottom = "5px";
                            div.innerText = `+ ${textTime}: ${textMoney}`;
                            scheduleContainer.appendChild(div);
                        });
                    } else {
                        scheduleContainer.innerHTML = "<div>(Chưa có lịch đóng chi tiết)</div>";
                    }

                    // 4. Chụp ảnh div Template và tạo PDF
                    const element = document.getElementById("pdf-export-template");
                    const canvas = await html2canvas(element, { scale: 2, useCORS: true, windowWidth: 800 });
                    const imgData = canvas.toDataURL('image/jpeg', 1.0);
                    
                    const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4'); // Khổ A4
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                    pdf.addImage(imgData, 'JPEG', 0, 10, pdfWidth, pdfHeight);
                    
                    // Lưu file
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

        /* ... (Phần Export ở trên giữ nguyên) ... */
    
        /* --- THỐNG KÊ TRUY CẬP (STATS) --- */
        Stats: {
            update: function() {
                const countEl = document.getElementById('visitor-count');
                if(!countEl) return;
    
                // Sử dụng API miễn phí countapi.xyz
                // Namespace: bhxh-tool-2026 (Bạn có thể đổi tên này thành tên riêng để không trùng với người khác)
                // Key: visits
                const namespace = 'bhxh-tool-2026-v1'; 
                const key = 'visits';
    
                fetch(`https://api.countapi.xyz/hit/${namespace}/${key}`)
                    .then(res => res.json())
                    .then(data => {
                        // Hiển thị số và định dạng có dấu chấm (ví dụ: 1.234)
                        countEl.innerText = Utils.formatNumber(data.value);
                    })
                    .catch(err => {
                        console.error("Lỗi đếm truy cập:", err);
                        countEl.innerText = "Error";
                    });
            }
        }
    }; // <-- Dấu đóng ngoặc kết thúc App

    // Chạy ứng dụng khi trình duyệt tải xong HTML
    document.addEventListener('DOMContentLoaded', () => { App.init(); });


