document.addEventListener('DOMContentLoaded', () => {
    // Состояние приложения
    let state = {
        currentDate: new Date(),
        shiftRate: 2000,
        shifts: {} // Храним даты в виде объекта: { 'YYYY-MM-DD': 'upcoming' | 'worked' }
    };

    // DOM Элементы
    const calendarTitle = document.getElementById('calendar-title');
    const daysGrid = document.getElementById('days-grid');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnToday = document.getElementById('btn-today');
    const inputShiftRate = document.getElementById('shift-rate');
    
    const statWorked = document.getElementById('stat-worked');
    const statUpcoming = document.getElementById('stat-upcoming');
    const statEarnings = document.getElementById('stat-earnings');
    const selectedDatesList = document.getElementById('selected-dates-list');

    // Инициализация приложения
    function init() {
        loadFromLocalStorage();
        inputShiftRate.value = state.shiftRate;
        
        // Слушатели событий
        btnPrev.addEventListener('click', () => changeMonth(-1));
        btnNext.addEventListener('click', () => changeMonth(1));
        btnToday.addEventListener('click', gotoToday);
        
        inputShiftRate.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            state.shiftRate = isNaN(val) || val < 0 ? 0 : val;
            saveToLocalStorage();
            updateStats();
        });

        render();
    }

    // Загрузка данных и миграция старых версий
    function loadFromLocalStorage() {
        const storedRate = localStorage.getItem('duty_shift_rate');
        const storedShifts = localStorage.getItem('duty_shifts_v2'); // Новый ключ
        const legacyDays = localStorage.getItem('duty_worked_days'); // Старый ключ
        
        if (storedRate !== null) state.shiftRate = parseInt(storedRate);
        
        if (storedShifts !== null) {
            state.shifts = JSON.parse(storedShifts);
        } else if (legacyDays !== null) {
            // МИГРАЦИЯ: Если пользователь обновил приложение, сохраняем его старые дни как "отработанные"
            try {
                const parsedLegacy = JSON.parse(legacyDays);
                if (Array.isArray(parsedLegacy)) {
                    parsedLegacy.forEach(dateStr => {
                        state.shifts[dateStr] = 'worked';
                    });
                }
                saveToLocalStorage(); // Сразу сохраняем в новом формате
            } catch(e) {}
        }
    }

    // Сохранение данных
    function saveToLocalStorage() {
        localStorage.setItem('duty_shift_rate', state.shiftRate);
        localStorage.setItem('duty_shifts_v2', JSON.stringify(state.shifts));
    }

    // Изменение месяца (+1 или -1)
    function changeMonth(direction) {
        state.currentDate.setMonth(state.currentDate.getMonth() + direction);
        render();
    }

    // Переход к текущей дате
    function gotoToday() {
        state.currentDate = new Date();
        render();
    }

    // Главная функция отрисовки
    function render() {
        renderCalendar();
        updateStats();
    }

    // Отрисовка сетки календаря
    function renderCalendar() {
        daysGrid.innerHTML = '';
        
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();

        calendarTitle.textContent = state.currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const totalDays = lastDayOfMonth.getDate();

        let startDayOfWeek = firstDayOfMonth.getDay() - 1;
        if (startDayOfWeek === -1) startDayOfWeek = 6;

        // Дни из предыдущего месяца
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            createDayCell(dayNum, true);
        }

        // Дни текущего месяца
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const currentLoopDate = new Date(year, month, day);
            const dateString = formatDate(currentLoopDate);
            
            const isToday = currentLoopDate.toDateString() === today.toDateString();
            const dayOfWeek = currentLoopDate.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            
            // Получаем статус дня из объекта shifts (undefined / 'upcoming' / 'worked')
            const shiftStatus = state.shifts[dateString];

            createDayCell(day, false, shiftStatus, isToday, isWeekend, dateString);
        }

        // Пустые места в конце
        const totalRendered = startDayOfWeek + totalDays;
        const remainingSlots = (7 - (totalRendered % 7)) % 7;
        for (let day = 1; day <= remainingSlots; day++) {
            createDayCell(day, true);
        }
    }

    // Создание DOM-элемента ячейки
    function createDayCell(dayNum, isOtherMonth, shiftStatus, isToday = false, isWeekend = false, dateString = '') {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');
        dayCell.textContent = dayNum;

        if (isOtherMonth) {
            dayCell.classList.add('other-month');
        } else {
            if (isWeekend) dayCell.classList.add('weekend');
            if (isToday) dayCell.classList.add('today');
            
            // Применяем класс в зависимости от статуса (Оранжевый или Зеленый)
            if (shiftStatus === 'upcoming') dayCell.classList.add('upcoming');
            if (shiftStatus === 'worked') dayCell.classList.add('worked');
            
            dayCell.dataset.date = dateString;
            dayCell.addEventListener('click', () => toggleDay(dateString));
        }

        daysGrid.appendChild(dayCell);
    }

    // Логика переключения статуса дежурства (3 состояния)
    function toggleDay(dateString) {
        const currentStatus = state.shifts[dateString];

        if (!currentStatus) {
            // 1 Клик: Нет статуса -> Предстоящая (Оранжевый)
            state.shifts[dateString] = 'upcoming';
        } else if (currentStatus === 'upcoming') {
            // 2 Клик: Предстоящая -> Отработано (Зеленый)
            state.shifts[dateString] = 'worked';
        } else {
            // 3 Клик: Отработано -> Сброс
            delete state.shifts[dateString];
        }
        
        saveToLocalStorage();
        render();
    }

    // Расчет и обновление статистики
    function updateStats() {
        const currentYear = state.currentDate.getFullYear();
        const currentMonth = state.currentDate.getMonth();

        let countWorked = 0;
        let countUpcoming = 0;
        let datesForList = [];

        // Перебираем все даты в словаре
        for (const [dateStr, status] of Object.entries(state.shifts)) {
            const d = new Date(dateStr);
            if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
                datesForList.push({ dateStr, status });
                if (status === 'worked') countWorked++;
                if (status === 'upcoming') countUpcoming++;
            }
        }

        // Зарплата считается ТОЛЬКО за отработанные (зеленые) дни
        const totalEarnings = countWorked * state.shiftRate;

        statWorked.textContent = countWorked;
        statUpcoming.textContent = countUpcoming;
        statEarnings.textContent = `${totalEarnings.toLocaleString('ru-RU')} ₽`;

        // Сортировка дат для красивого вывода
        datesForList.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

        selectedDatesList.innerHTML = '';
        if (datesForList.length === 0) {
            selectedDatesList.innerHTML = '<li style="color: var(--text-muted); justify-content: center;">Дни не выбраны</li>';
        } else {
            datesForList.forEach(item => {
                const d = new Date(item.dateStr);
                const formattedDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
                const li = document.createElement('li');
                
                if (item.status === 'upcoming') {
                    li.innerHTML = `<span>${formattedDate}</span> <span class="list-upcoming">В плане</span>`;
                } else if (item.status === 'worked') {
                    li.innerHTML = `<span>${formattedDate}</span> <span class="list-worked">+ ${state.shiftRate.toLocaleString('ru-RU')} ₽</span>`;
                }
                
                selectedDatesList.appendChild(li);
            });
        }
    }

    // Форматирование даты YYYY-MM-DD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Запуск приложения
    init();
});