🌟 Life Planner

O Life Planner é um planner pessoal minimalista, inspirado no Notion, para gerenciar tarefas, compromissos e metas. Ideal para estudantes e profissionais, com interface moderna, tema escuro e suporte a desktop e mobile.

🚀 Funcionalidades Principais
Funcionalidade	Descrição
✅ Gerenciamento de Tarefas	Crie, edite, conclua e organize suas tarefas facilmente
📊 Dashboard	Visualize estatísticas e progresso das atividades
📅 Calendário	Organize suas tarefas por dia, semana e mês
⚙️ Configurações	Personalize cores, layout e preferências
🔐 Autenticação	Login seguro para usuários Pro
📱 Responsivo	Funciona em desktops, notebooks e dispositivos móveis
🖤 Tema Escuro	Visual limpo, elegante e moderno inspirado no Notion
🧩 Drag & Drop	Organize tarefas arrastando e soltando facilmente
🛠️ Tecnologias Utilizadas
Backend

Flask – Framework web Python

SQLite – Banco de dados local e leve

JWT – Autenticação segura

Flask-CORS – Suporte a requisições cross-origin

Werkzeug – Utilitários web

Frontend

React 18 – Biblioteca moderna para UI

React Router – Navegação entre páginas

Axios – Comunicação HTTP com backend

Lucide React – Ícones minimalistas

React Beautiful DnD – Drag & drop para tarefas

Date-fns – Manipulação de datas

📁 Estrutura do Projeto
/life-planner
├─ /frontend
│  ├─ /public
│  └─ /src
│      ├─ /assets
│      ├─ /components
│      ├─ /pages
│      ├─ /i18n
│      ├─ /styles
│      ├─ App.jsx
│      └─ index.jsx
├─ /backend
│  ├─ app.py
│  ├─ /routes
│  │   ├─ tarefas.py
│  │   └─ auth.py
│  ├─ models.py
│  ├─ database.py
│  └─ requirements.txt
├─ /scripts
│  └─ criar_banco_sqlite.py
└─ README.md

⚡ Como Rodar o Projeto
Backend
cd backend
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows
pip install -r requirements.txt
python scripts/criar_banco_sqlite.py
python app.py

Frontend
cd frontend
npm install
npm start


Acesse em http://localhost:3000.
