#  ArtWave - Виртуальная выставка начинающих художников

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)

**ArtWave** — это интерактивная веб-платформа для организации виртуальных выставок работ начинающих художников. Проект разработан в рамках выпускной квалификационной работы и предоставляет удобные инструменты для демонстрации творчества, взаимодействия с аудиторией и кураторской поддержки.

![Главная страница проекта](https://github.com/SJana0/Artwave/blob/main/artwavePreview.png)

## Особенности

- **Мультиролевая система**:
  - Художники: загрузка работ, участие в выставках
  - Гости: просмотр
  - Зрители: просмотр, лайки, комментарии
  - Администраторы: управление контентом
  - Эксперты: модерация заявок

- **Технологический стек**:
  - Frontend: HTML5, TailwindCSS, JavaScript (Choices.js, SweetAlert2, Day.js)
  - Backend: Node.js + Express.js (REST API, JWT, Multer, bcrypt)
  - Database: MySQL

## Документация и файлы проекта

Для краткого описания проекта смотрите файл: Степанова.pdf

Для презентации: Степанова_ВКРБ_Презентация_4.0.pptx

## Установка и запуск проекта

### Требования

- [Node.js](https://nodejs.org/) версии 18.x или выше
- [MySQL](https://www.mysql.com/) версии 8.0 или выше

### Шаги по установке

1. **Клонируйте репозиторий**

```bash
git clone https://github.com/ваш_репозиторий/artwave.git
cd artwave
```

2. **Настройте базу данных**

Создайте новую базу данных в MySQL:

```sql
CREATE DATABASE artwave;
```

3. **Импортируйте дамп базы данных**

Запустите DumpArtwave.sql в MySQL, в первой строке прописав Use artwave; или с помощью команды:

```bash
mysql -u <ваш_пользователь> -p artwave < path/to/DumpArtwave.sql
```

4. **Настройте параметры подключения к базе данных**
   
В файле .env укажите параметры подключения

5. **Установите зависимости**
6. **Запустите сервер в терминале редактора кода**

```
node index.js
```

Откройте браузер и перейдите по адресу:
http://localhost:3000

