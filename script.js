class CotisationSystem {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.payments = {
            idrissa: new Set(),
            zabre: new Set()
        };
        this.dailyAmount = 1000;

        this.init();
    }

    init() {
        this.loadPaymentsFromStorage();
        this.setupEventListeners();
        this.updateCalendar();
        this.updateStats();
    }

    loadPaymentsFromStorage() {
        const saved = localStorage.getItem('cotisationPayments');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.payments.idrissa = new Set(parsed.idrissa || []);
                this.payments.zabre = new Set(parsed.zabre || []);
            } catch {
                this.payments = { idrissa: new Set(), zabre: new Set() };
            }
        }
    }

    savePaymentsToStorage() {
        const toSave = {
            idrissa: Array.from(this.payments.idrissa),
            zabre: Array.from(this.payments.zabre)
        };
        localStorage.setItem('cotisationPayments', JSON.stringify(toSave));
    }

    setupEventListeners() {
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.updateCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.updateCalendar();
        });
    }

    updateCalendar() {
        const calendar = document.getElementById('calendar');
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        document.getElementById('currentMonth').textContent =
            `${monthNames[this.currentMonth]} ${this.currentYear}`;

        calendar.innerHTML = '';

        const dayHeaders = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
        });

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell other-month';
            calendar.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = this.createDayCell(day);
            calendar.appendChild(dayCell);
        }

        this.updateNavButtons();
    }

    createDayCell(day) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';

        const cellDate = new Date(this.currentYear, this.currentMonth, day);
        const today = new Date();
        const dateString = this.formatDate(cellDate);

        if (cellDate.toDateString() === today.toDateString()) {
            dayCell.classList.add('today');
        }

        if (cellDate < today && cellDate.toDateString() !== today.toDateString()) {
            dayCell.classList.add('past');
        }

        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);

        if (this.currentYear === 2025 && cellDate >= new Date(2025, 6, 1)) {
            const paymentDiv = document.createElement('div');
            paymentDiv.className = 'person-payment';

            const idrissamItem = this.createPaymentItem('idrissa', 'Idrissa', dateString, cellDate);
            const zabreItem = this.createPaymentItem('zabre', 'Zabre', dateString, cellDate);

            paymentDiv.appendChild(idrissamItem);
            paymentDiv.appendChild(zabreItem);
            dayCell.appendChild(paymentDiv);

            this.addDelayIndicator(dayCell, dateString);
        }

        return dayCell;
    }

    createPaymentItem(person, displayName, dateString, cellDate) {
        const item = document.createElement('div');
        item.className = 'payment-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'payment-checkbox';
        checkbox.setAttribute('data-person', person);
        checkbox.setAttribute('data-date', dateString);

        checkbox.checked = this.payments[person].has(dateString);

        const today = new Date();

        if (cellDate > today || checkbox.checked) {
            checkbox.disabled = true;
            checkbox.style.cursor = 'not-allowed';
        } else {
            const previousUnpaid = this.hasUnpaidPreviousDate(person, cellDate);
            if (previousUnpaid) {
                checkbox.disabled = true;
                checkbox.title = "Veuillez cocher les jours précédents d'abord";
                checkbox.style.cursor = 'not-allowed';
            } else {
                checkbox.disabled = false;
                checkbox.style.cursor = 'pointer';
            }
        }

        checkbox.addEventListener('change', (e) => {
            this.handlePaymentChange(person, dateString, e.target.checked);
        });

        const name = document.createElement('span');
        name.className = `person-name ${person}`;

        if (cellDate.toDateString() === today.toDateString()) {
            const delayAmount = this.calculateDelay(person);
            name.innerHTML = `${displayName} <span class="amount-due">(${delayAmount.toLocaleString()})</span>`;
        } else {
            name.textContent = displayName;
        }

        item.appendChild(checkbox);
        item.appendChild(name);

        return item;
    }

    hasUnpaidPreviousDate(person, currentDate) {
        const startDate = new Date(2025, 6, 1); // 1er juillet 2025
        const date = new Date(startDate);

        while (date < currentDate) {
            const dateString = this.formatDate(date);
            if (!this.payments[person].has(dateString)) {
                return true;
            }
            date.setDate(date.getDate() + 1);
        }

        return false;
    }

    calculateDelay(person) {
        const today = new Date();
        const startDate = new Date(2025, 6, 1);
        let totalDelay = 0;

        for (let date = new Date(startDate); date < today; date.setDate(date.getDate() + 1)) {
            const dateString = this.formatDate(date);
            if (!this.payments[person].has(dateString)) {
                totalDelay += this.dailyAmount;
            }
        }

        return totalDelay;
    }

    addDelayIndicator(dayCell, dateString) {
        const today = new Date();
        const cellDate = new Date(dateString);
        const startDate = new Date(2025, 6, 1);

        if (cellDate < today && cellDate >= startDate) {
            let hasDelay = false;
            let delayCount = 0;

            if (!this.payments.idrissa.has(dateString)) {
                hasDelay = true;
                delayCount++;
            }
            if (!this.payments.zabre.has(dateString)) {
                hasDelay = true;
                delayCount++;
            }

            if (hasDelay) {
                const indicator = document.createElement('div');
                indicator.className = 'delay-indicator';
                indicator.textContent = delayCount;
                indicator.title = 'Retard de paiement';
                indicator.addEventListener('click', () => {
                    this.showDelayModal(dateString);
                });
                dayCell.appendChild(indicator);
            }
        }
    }

    handlePaymentChange(person, dateString, isChecked) {
        if (isChecked) {
            this.payments[person].add(dateString);
            const checkboxes = document.querySelectorAll(`input[data-person="${person}"][data-date="${dateString}"]`);
            checkboxes.forEach(checkbox => {
                checkbox.disabled = true;
                checkbox.style.cursor = 'not-allowed';
            });
        } else {
            const checkboxes = document.querySelectorAll(`input[data-person="${person}"][data-date="${dateString}"]`);
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
        }

        this.savePaymentsToStorage();
        this.updateStats();
        this.updateCalendar();
    }

    showDelayModal(dateString) {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('fr-FR');
        let message = `Date: ${formattedDate}\n\n`;
        let totalDelay = 0;

        if (!this.payments.idrissa.has(dateString)) {
            message += `Idrissa: Retard = ${this.dailyAmount}\n`;
            totalDelay += this.dailyAmount;
        }

        if (!this.payments.zabre.has(dateString)) {
            message += `Zabre: Retard = ${this.dailyAmount}\n`;
            totalDelay += this.dailyAmount;
        }

        message += `\nTotal pour cette date: ${totalDelay}`;

        document.getElementById('delayMessage').innerHTML = message.replace(/\n/g, '<br>');
        document.getElementById('delayModal').style.display = 'block';
    }

    updateStats() {
        const today = new Date();
        const startDate = new Date(2025, 6, 1);
        const endOfYear = new Date(2025, 11, 31);

        const daysRemaining = Math.ceil((endOfYear - today) / (1000 * 60 * 60 * 24)) + 1;
        const totalDaysInPeriod = Math.ceil((endOfYear - startDate) / (1000 * 60 * 60 * 24)) + 1;

        document.getElementById('daysRemaining').textContent = daysRemaining;
        document.getElementById('totalExpected').textContent =
            (totalDaysInPeriod * this.dailyAmount * 2).toLocaleString();

        const idrissamDelay = this.calculateDelay('idrissa');
        const zabreDelay = this.calculateDelay('zabre');

        document.getElementById('delayIdrissa').textContent = idrissamDelay.toLocaleString();
        document.getElementById('delayZabre').textContent = zabreDelay.toLocaleString();
    }

    updateNavButtons() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        const today = new Date();

        prevBtn.disabled = this.currentYear < 2025 || (this.currentYear === 2025 && this.currentMonth < 6);
        nextBtn.disabled = this.currentYear > today.getFullYear() ||
            (this.currentYear === today.getFullYear() && this.currentMonth >= today.getMonth());
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}

function closeModal() {
    document.getElementById('delayModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    new CotisationSystem();
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('delayModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});
