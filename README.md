# Розклад занять

Учні бачать розклад за посиланням, і всі зміни до них приходять одразу. Викладач входить через Google, редагує розклад, відмічає уроки й веде абонементи.

## Як підключити (10 хвилин, безкоштовно)

1. Зайди на https://console.firebase.google.com і натисни **Create project**.
2. **Build → Firestore Database → Create database**: обери Production mode і регіон `eur3`.
3. **Firestore → Rules**: встав вміст `firestore.rules`, заміни `ТВОЯ_ПОШТА@gmail.com` на свою пошту й натисни **Publish**.
4. **Build → Authentication → Get started → Google**: увімкни (Enable).
5. **Project settings → Your apps → Web (`</>`)**: скопіюй `firebaseConfig` у `config.js`, а в `TEACHER_EMAIL` впиши ту саму пошту.
6. Задеплой папку на Netlify, Vercel, GitHub Pages чи Firebase Hosting. Домен сайту додай у **Authentication → Settings → Authorized domains**.
7. Відкрий сайт і натисни **Вхід для викладача**. Потім **Імпортувати розклад з таблиці**, а в розділі «Учні» додай кожному кількість оплачених уроків.

Для перевірки на своєму компʼютері: `npx serve .` (вхід через Google працює на `localhost`).

## Як рахуються уроки

Залишилось = оплачено − (Був + Пропустив). «Перенесено» урок не списує.
Щоб виправити помилку з кількістю, введи у «+ уроки» відʼємне число.
