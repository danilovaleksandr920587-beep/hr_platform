// Supabase Auth — общий модуль для всех страниц сайта

const SUPABASE_URL = "https://tetukoylasquueg.beget.app";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2NjQzMjAwLCJleHAiOjE5MzQ0MDk2MDB9.5XEDypOTMio-_M7UcHZnocTFN65ckAwLhzvyS_qF7pA";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Возвращает текущего пользователя или null
async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Разлогинить и перейти на главную
async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// Обновляет кнопку «В кабинет» / «Выйти» в шапке на основе сессии
async function updateNavAuth() {
  const user = await getUser();
  // Ищем ссылки на office.html и кнопки выхода
  document.querySelectorAll("[data-auth-btn]").forEach(el => {
    if (user) {
      el.textContent = "Выйти";
      el.href = "#";
      el.addEventListener("click", e => { e.preventDefault(); signOut(); });
    } else {
      el.textContent = "Войти";
      el.href = "auth.html";
    }
  });

  document.querySelectorAll("[data-auth-cabinet]").forEach(el => {
    if (user) {
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });

  document.querySelectorAll("[data-auth-user]").forEach(el => {
    if (user) {
      el.textContent = user.email || "Пользователь";
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });
}

// Перенаправляет на auth.html, если пользователь не залогинен (для защищённых страниц)
async function requireAuth() {
  const user = await getUser();
  if (!user) {
    window.location.href = "auth.html?next=" + encodeURIComponent(window.location.pathname.split("/").pop() || "office.html");
    return null;
  }
  return user;
}
