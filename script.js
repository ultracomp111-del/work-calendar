document.addEventListener('DOMContentLoaded', () => {
    // Состояние приложения
    let state = {
        currentDate: new Date(), // Текущий просматриваемый месяц/год
        shiftRate: 2000,         // Стоимость смены по умолчанию
        workedDays: []           // Массив строк дат в формате 'YYYY-MM-DD'
    };

    // DOM Элементы
    const calendarTitle = document.getElementById('calendar-title');
    const daysGrid = document.getElementById('days-grid');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnToday = document.getElementById('btn-today');
    const btnClear = document.getElementById('btn-clear');
    const inputShiftRate = document.getElementById('shift-rate');
    
    const statDays = document.getElementById('stat-days');
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
        btnClear.addEventListener('click', clearCurrentMonth);
        
        inputShiftRate.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            state.shiftRate = isNaN(val) || val < 0 ? 0 : val;
            saveToLocalStorage();
            updateStats();
        });

        render();
    }

    // Загрузка данных
    function loadFromLocalStorage() {
        const storedRate = localStorage.getItem('duty_shift_rate');
        const storedDays = localStorage.getItem('duty_worked_days');
        
        if (storedRate !== null) state.shiftRate = parseInt(storedRate);
        if (storedDays !== null) state.workedDays = JSON.parse(storedDays);
    }

    // Сохранение данных
    function saveToLocalStorage() {
        localStorage.setItem('duty_shift_rate', state.shiftRate);
        localStorage.setItem('duty_worked_days', JSON.stringify(state.workedDays));
    }

    // Изменение месяца (+1 или -1)
    function changeMonth(direction) {
        state.currentDate.setMonth(state.currentDate.getMonth() + direction);
        render();
    }

    // Переход к текущей дате ("Сегодня")
    function gotoToday() {
        state.currentDate = new Date();
        render();
    }

    // Очистить все дежурства за текущий активный месяц
    function clearCurrentMonth() {
        const currentYear = state.currentDate.getFullYear();
        const currentMonth = state.currentDate.getMonth();
        const monthName = state.currentDate.toLocaleString('ru-RU', { month: 'long' });

        if (confirm(`Вы уверены, что хотите удалить ВСЕ дежурства за ${monthName}?`)) {
            state.workedDays = state.workedDays.filter(dateStr => {
                const d = new Date(dateStr);
                return !(d.getFullYear() === currentYear && d.getMonth() === currentMonth);
            });
            saveToLocalStorage();
            render();
        }
    }

    // Главная функция отрисовки интерфейса
    function render() {
        renderCalendar();
        updateStats();
    }

    // Отрисовка сетки календаря
    function renderCalendar() {
        daysGrid.innerHTML = '';
        
        const year = state.currentDate.getFullYear();
        const month = state.currentDate.getMonth();

        // Установка заголовка (например, "Июнь 2026")
        calendarTitle.textContent = state.currentDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

        // Первый день месяца и общее количество дней
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const totalDays = lastDayOfMonth.getDate();

        // Преобразование дня недели для Пн-Вс структуры (в JS 0 - это Вс, переводим Пн -> 0 ... Вс -> 6)
        let startDayOfWeek = firstDayOfMonth.getDay() - 1;
        if (startDayOfWeek === -1) startDayOfWeek = 6;

        // Дни из предыдущего месяца для заполнения пустых мест в начале сетки
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            createDayCell(dayNum, true, false);
        }

        // Рендеринг основных дней месяца
        const today = new Date();
        for (let day = 1; day <= totalDays; day++) {
            const currentLoopDate = new Date(year, month, day);
            const dateString = formatDate(currentLoopDate);
            
            // Проверка условий для классов стилей
            const isToday = currentLoopDate.toDateString() === today.toDateString();
            const dayOfWeek = currentLoopDate.getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const isWorked = state.workedDays.includes(dateString);

            createDayCell(day, false, isWorked, isToday, isWeekend, dateString);
        }

        // Заполнение пустых мест в конце сетки днями следующего месяца до ровных недель
        const totalRendered = startDayOfWeek + totalDays;
        const remainingSlots = (7 - (totalRendered % 7)) % 7;
        for (let day = 1; day <= remainingSlots; day++) {
            createDayCell(day, true, false);
        }
    }

    // Создание DOM-элемента ячейки дня
    function createDayCell(dayNum, isOtherMonth, isWorked, isToday = false, isWeekend = false, dateString = '') {
        const dayCell = document.createElement('div');
        dayCell.classList.add('calendar-day');
        dayCell.textContent = dayNum;

        if (isOtherMonth) {
            dayCell.classList.add('other-month');
        } else {
            if (isWeekend) dayCell.classList.add('weekend');
            if (isToday) dayCell.classList.add('today');
            if (isWorked) dayCell.classList.add('worked');
            
            // Вешаем обработчик тапа по дню
            dayCell.dataset.date = dateString;
            dayCell.addEventListener('click', () => toggleDay(dateString));
        }

        daysGrid.appendChild(dayCell);
    }

    // Переключение статуса дежурства (выбрано / не выбрано)
    function toggleDay(dateString) {
        const index = state.workedDays.indexOf(dateString);
        if (index > -1) {
            state.workedDays.splice(index, 1); // Удаляем, если уже было
        } else {
            state.workedDays.push(dateString); // Добавляем, если не было
        }
        
        saveToLocalStorage();
        render();
    }

    // Расчет и обновление статистики
    function updateStats() {
        const currentYear = state.currentDate.getFullYear();
        const currentMonth = state.currentDate.getMonth();

        // Фильтруем дежурства, относящиеся ТОЛЬКО к текущему выбранному месяцу
        const currentMonthDays = state.workedDays.filter(dateStr => {
            const d = new Date(dateStr);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        // Сортируем даты по возрастанию для красивого вывода в список
        currentMonthDays.sort((a, b) => new Date(a) - new Date(b));

        const countDays = currentMonthDays.length;
        const totalEarnings = countDays * state.shiftRate;

        // Обновление текстовых счетчиков на панели
        statDays.textContent = countDays;
        statEarnings.textContent = `${totalEarnings.toLocaleString('ru-RU')} ₽`;

        // Обновление выпадающего списка выбранных дат
        selectedDatesList.innerHTML = '';
        if (countDays === 0) {
            selectedDatesList.innerHTML = '<li style="color: var(--text-muted); justify-content: center;">Дни не выбраны</li>';
        } else {
            currentMonthDays.forEach(dateStr => {
                const d = new Date(dateStr);
                const formatOptions = { day: 'numeric', month: 'long' };
                const formattedDate = d.toLocaleDateString('ru-RU', formatOptions);
                
                const li = document.createElement('li');
                li.innerHTML = `<span>${formattedDate}</span> <strong>+ ${state.shiftRate.toLocaleString('ru-RU')} ₽</strong>`;
                selectedDatesList.appendChild(li);
            });
        }
    }

    // Вспомогательная функция форматирования даты в строку YYYY-MM-DD без сдвига часовых поясов
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Запуск приложения
    init();
});