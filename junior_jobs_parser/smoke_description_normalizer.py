from __future__ import annotations

from description_normalizer import normalize_description


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run() -> None:
    cdek_text = """
Чем предстоит заниматься:
Осуществлять мониторинг состояния сервисов и инфраструктуры с использованием Prometheus, Grafana, AlertManager
Проводить первичную диагностику и оценку влияния на пользователей
Возможен удаленный формат. Для нас важно: Навыки самостоятельного решения программных проблем
Знание Python
Linux, SQL
Условия:
- ДМС
- Узнайте больше о направлении
- Открыть в Яндекс Картах
- Хорошо
Условия использования
Часто задаваемые вопросы
"""
    cdek = normalize_description(
        raw_text=cdek_text,
        title="Инженер по эксплуатации информационных систем",
        company="CDEK",
        source="https://rabota.cdek.ru/",
        apply_url="https://rabota.cdek.ru/vacancy/123",
    )
    _assert(any(b["kind"] == "tasks" for b in cdek.description_blocks), "CDEK tasks block missing")
    _assert(any("prometheus, grafana, alertmanager" in " ".join(b["items"]).lower() for b in cdek.description_blocks), "CDEK monitoring stack should stay in one item")
    _assert("условия использования" not in cdek.description.lower(), "CDEK trailing junk not removed")
    _assert("часто задаваемые вопросы" not in cdek.description.lower(), "CDEK FAQ junk not removed")
    _assert("открыть в яндекс картах" not in cdek.description.lower(), "CDEK maps junk not removed")
    _assert("хорошо" not in cdek.description.lower(), "CDEK single-word UI junk not removed")
    _assert(sum(1 for b in cdek.description_blocks if b["kind"] == "conditions") == 1, "CDEK duplicate conditions blocks")
    _assert(any(b["kind"] == "requirements" for b in cdek.description_blocks), "CDEK requirements block missing")
    _assert(cdek.signals.get("exp") in ("lt1", None), "CDEK exp signal mismatch")

    sber_text = """
О вакансии
Задачи:
- Поддержка внутренних систем
Требования:
- Опыт от 3 лет в эксплуатации
- Python
Откликнуться
"""
    sber = normalize_description(
        raw_text=sber_text,
        title="Стажер блока финансов противодействия мошенничеству",
        company="Сбер",
        source="https://sber.ru/jobs",
        apply_url="https://sber.ru/jobs/999",
    )
    _assert(sber.signals.get("exp") == "1-3", "Sber exp signal mismatch")
    _assert(any(b["kind"] == "requirements" for b in sber.description_blocks), "Sber requirements block missing")

    cian_text = """
Вакансии Циан в Московской области
Мы ищем активных и коммуникабельных специалистов.
Находимся в поиске коллеги, у которого есть:
- опыт активных продаж по телефону
Основная задача сотрудника — общение с клиентами по телефону.
Мы предлагаем:
- удаленный формат
"""
    cian = normalize_description(
        raw_text=cian_text,
        title="Вакансии Циан в Московской области",
        company="ЦИАН",
        source="https://www.cian.ru/vacancies/",
        apply_url="https://www.cian.ru/vacancies/1542/",
    )
    _assert(cian.suggested_title is not None, "CIAN generic title was not replaced")
    _assert(any(b["kind"] == "tasks" for b in cian.description_blocks), "CIAN tasks block missing")
    _assert(any(b["kind"] == "requirements" for b in cian.description_blocks), "CIAN requirements block missing")
    _assert(any(b["kind"] == "conditions" for b in cian.description_blocks), "CIAN conditions block missing")

    avito_text = """
Вакансия Авито «Менеджер» в городе Москва
Направления Data Science UX-исследования Продажи
Что предстоит делать:
- Вести клиентский портфель
Наши ожидания:
- Опыт B2B продаж
Условия:
- Гибрид
Рекомендовать друга
"""
    avito = normalize_description(
        raw_text=avito_text,
        title="Менеджер по продажам",
        company="Авито",
        source="https://career.avito.com/",
        apply_url="https://career.avito.com/vacancies/prodazhi/1/",
    )
    _assert(any(b["kind"] == "tasks" for b in avito.description_blocks), "Avito tasks block missing")
    _assert(any(b["kind"] == "requirements" for b in avito.description_blocks), "Avito requirements block missing")
    _assert("рекомендовать друга" not in avito.description.lower(), "Avito footer junk not removed")

    tbank_text = """
Пропустить навигацию Вакансии О нас Быстрые офферы
Чем предстоит заниматься:
- Делать дашборды
Мы ждем, что ты:
- SQL
Условия:
- ДМС
Фамилия Имя Почта Телефон Отправить
"""
    tbank = normalize_description(
        raw_text=tbank_text,
        title="Продуктовый аналитик",
        company="Т-Банк",
        source="https://www.tbank.ru/career/",
        apply_url="https://www.tbank.ru/career/it/vacancy/123/",
    )
    _assert("фамилия имя" not in tbank.description.lower(), "TBank form leak remains")
    _assert(any(b["kind"] == "conditions" for b in tbank.description_blocks), "TBank conditions block missing")

    kontur_text = """
Компания→ Работа у нас→ Вакансии
Задачи:
- Проводить демо
Мы ожидаем:
- Коммуникабельность
Условия:
- Удаленка
Резюме или загрузите файл
"""
    kontur = normalize_description(
        raw_text=kontur_text,
        title="Менеджер по продажам",
        company="Контур",
        source="https://kontur.ru/career/",
        apply_url="https://kontur.ru/career/vacancies/1",
    )
    _assert("загрузите файл" not in kontur.description.lower(), "Kontur form junk not removed")

    kaspersky_text = """
Главная Вакансии
Основные задачи:
- Планирование релизов
Мы ожидаем:
- Опыт управления проектами
Условия:
- ДМС
"""
    kaspersky = normalize_description(
        raw_text=kaspersky_text,
        title="Project Manager",
        company="Лаборатория Касперского",
        source="https://careers.kaspersky.ru/",
        apply_url="https://careers.kaspersky.ru/vacancy/1",
    )
    _assert(any(b["kind"] == "tasks" for b in kaspersky.description_blocks), "Kaspersky tasks alias not recognized")

    lamoda_text = """
Ко всем вакансиям
Чем ты будешь заниматься:
- Выдавать заказы покупателям
- Консультировать по условиям оплаты
Мы предлагаем:
- Официальное оформление
- Обучение и скидки
"""
    lamoda = normalize_description(
        raw_text=lamoda_text,
        title="Специалист по работе с заказами",
        company="Lamoda",
        source="https://job.lamoda.ru/",
        apply_url="https://job.lamoda.ru/vacancies/moskva-sts/spetsialist-po-rabote-s-zakazami--1576",
    )
    _assert(any(b["kind"] == "tasks" for b in lamoda.description_blocks), "Lamoda tasks block missing")
    _assert(any(b["kind"] == "conditions" for b in lamoda.description_blocks), "Lamoda conditions block missing")

    positive_text = """
Product Manager/Менеджер по продукту NGFW
Чем предстоит заниматься:
- Вести бэклог по треку
- Контролировать delivery
Наши ожидания:
- Опыт B2B от 5 лет
- Знание сетевого стека
Мы предлагаем:
- 28 календарных дней отпуска
- Комфортный офис
Почта
Отправить
"""
    positive = normalize_description(
        raw_text=positive_text,
        title="Product Manager/Менеджер по продукту NGFW",
        company="Positive Technologies",
        source="https://ptsecurity.com/",
        apply_url="https://ptsecurity.com/about/vacancy/product-manager-menedzher-po-produktu-ngfw/",
    )
    _assert(any(b["kind"] == "tasks" for b in positive.description_blocks), "Positive tasks block missing")
    _assert(any(b["kind"] == "requirements" for b in positive.description_blocks), "Positive requirements block missing")
    _assert(any(b["kind"] == "conditions" for b in positive.description_blocks), "Positive conditions block missing")
    _assert("почта" not in positive.description.lower(), "Positive form leak remains")

    yandex_text = """
Задачи:
Оптимизация процессов
Вам предстоит согласовывать требования и участвовать в настройке системы.
Требования:
* SQL
Условия:
Описание:
* Гибрид
"""
    yandex = normalize_description(
        raw_text=yandex_text,
        title="Системный аналитик",
        company="Яндекс",
        source="https://forms.yandex.ru/",
        apply_url="https://forms.yandex.ru/surveys/1",
    )
    _assert(any(b["kind"] == "tasks" for b in yandex.description_blocks), "Yandex tasks block missing")
    _assert("описание:" not in yandex.description.lower(), "Yandex marker leaked to final text")

    print("smoke_description_normalizer: OK")


if __name__ == "__main__":
    run()

