from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from datetime import datetime, timedelta
import sqlite3
import os
import json
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configuração do Flask para servir arquivos estáticos
app = Flask(__name__, static_folder='../static', static_url_path='/static')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-secret-key-for-development')

# Configurar CORS para permitir requisições do frontend
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
CORS(app, origins=cors_origins)

# Configuração do banco de dados
database_url = os.getenv('DATABASE_URL', 'database/life_planner.db')
if database_url.startswith('sqlite:///'):
    DATABASE_PATH = database_url.replace('sqlite:///', '')
else:
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', database_url)

def init_db():
    """Inicializa o banco de dados com as tabelas necessárias"""
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Tabela de usuários (para plano Pro)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_pro BOOLEAN DEFAULT FALSE
        )
    ''')
    
    # Tabela de tarefas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            due_date TIMESTAMP,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            category TEXT,
            user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Tabela de configurações do usuário
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            theme TEXT DEFAULT 'dark',
            notifications BOOLEAN DEFAULT TRUE,
            language TEXT DEFAULT 'pt-BR',
            timezone TEXT DEFAULT 'America/Sao_Paulo',
            settings_json TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Retorna uma conexão com o banco de dados"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Decorator para verificar autenticação
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            # Para usuários não logados (plano gratuito), usar user_id = None
            return f(current_user=None, *args, **kwargs)
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data['user_id']
        except:
            return jsonify({'message': 'Token inválido'}), 401
        
        return f(current_user=current_user, *args, **kwargs)
    
    return decorated

# Rotas de autenticação
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        
        if not email or not password or not name:
            return jsonify({'message': 'Email, senha e nome são obrigatórios'}), 400
        
        conn = get_db_connection()
        
        # Verificar se o usuário já existe
        existing_user = conn.execute(
            'SELECT id FROM users WHERE email = ?', (email,)
        ).fetchone()
        
        if existing_user:
            return jsonify({'message': 'Email já cadastrado'}), 400
        
        # Criar novo usuário
        password_hash = generate_password_hash(password)
        cursor = conn.execute(
            'INSERT INTO users (email, password_hash, name, is_pro) VALUES (?, ?, ?, ?)',
            (email, password_hash, name, True)
        )
        user_id = cursor.lastrowid
        
        # Criar configurações padrão
        conn.execute(
            'INSERT INTO user_settings (user_id) VALUES (?)',
            (user_id,)
        )
        
        conn.commit()
        conn.close()
        
        # Gerar token
        token = jwt.encode({
            'user_id': user_id,
            'exp': datetime.utcnow() + timedelta(days=30)
        }, app.config['SECRET_KEY'])
        
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'token': token,
            'user': {
                'id': user_id,
                'email': email,
                'name': name,
                'is_pro': True
            }
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'message': 'Email e senha são obrigatórios'}), 400
        
        conn = get_db_connection()
        user = conn.execute(
            'SELECT * FROM users WHERE email = ?', (email,)
        ).fetchone()
        conn.close()
        
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'message': 'Credenciais inválidas'}), 401
        
        # Gerar token
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.utcnow() + timedelta(days=30)
        }, app.config['SECRET_KEY'])
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name'],
                'is_pro': user['is_pro']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

# Rotas de tarefas
@app.route('/api/tasks', methods=['GET'])
@token_required
def get_tasks(current_user):
    try:
        conn = get_db_connection()
        
        # Para usuários não logados, buscar tarefas sem user_id
        if current_user is None:
            tasks = conn.execute(
                'SELECT * FROM tasks WHERE user_id IS NULL ORDER BY created_at DESC'
            ).fetchall()
        else:
            tasks = conn.execute(
                'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
                (current_user,)
            ).fetchall()
        
        conn.close()
        
        tasks_list = []
        for task in tasks:
            tasks_list.append({
                'id': task['id'],
                'title': task['title'],
                'description': task['description'],
                'due_date': task['due_date'],
                'status': task['status'],
                'priority': task['priority'],
                'category': task['category'],
                'created_at': task['created_at'],
                'updated_at': task['updated_at']
            })
        
        return jsonify(tasks_list), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@app.route('/api/tasks', methods=['POST'])
@token_required
def create_task(current_user):
    try:
        data = request.get_json()
        title = data.get('title')
        description = data.get('description', '')
        due_date = data.get('due_date')
        priority = data.get('priority', 'medium')
        category = data.get('category', '')
        
        if not title:
            return jsonify({'message': 'Título é obrigatório'}), 400
        
        conn = get_db_connection()
        cursor = conn.execute(
            '''INSERT INTO tasks (title, description, due_date, priority, category, user_id)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (title, description, due_date, priority, category, current_user)
        )
        task_id = cursor.lastrowid
        conn.commit()
        
        # Buscar a tarefa criada
        task = conn.execute(
            'SELECT * FROM tasks WHERE id = ?', (task_id,)
        ).fetchone()
        conn.close()
        
        return jsonify({
            'id': task['id'],
            'title': task['title'],
            'description': task['description'],
            'due_date': task['due_date'],
            'status': task['status'],
            'priority': task['priority'],
            'category': task['category'],
            'created_at': task['created_at'],
            'updated_at': task['updated_at']
        }), 201
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@token_required
def update_task(current_user, task_id):
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        
        # Verificar se a tarefa existe e pertence ao usuário
        if current_user is None:
            task = conn.execute(
                'SELECT * FROM tasks WHERE id = ? AND user_id IS NULL', (task_id,)
            ).fetchone()
        else:
            task = conn.execute(
                'SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, current_user)
            ).fetchone()
        
        if not task:
            conn.close()
            return jsonify({'message': 'Tarefa não encontrada'}), 404
        
        # Atualizar campos fornecidos
        update_fields = []
        update_values = []
        
        if 'title' in data:
            update_fields.append('title = ?')
            update_values.append(data['title'])
        
        if 'description' in data:
            update_fields.append('description = ?')
            update_values.append(data['description'])
        
        if 'due_date' in data:
            update_fields.append('due_date = ?')
            update_values.append(data['due_date'])
        
        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])
        
        if 'priority' in data:
            update_fields.append('priority = ?')
            update_values.append(data['priority'])
        
        if 'category' in data:
            update_fields.append('category = ?')
            update_values.append(data['category'])
        
        update_fields.append('updated_at = ?')
        update_values.append(datetime.now().isoformat())
        
        update_values.append(task_id)
        
        conn.execute(
            f'UPDATE tasks SET {", ".join(update_fields)} WHERE id = ?',
            update_values
        )
        conn.commit()
        
        # Buscar a tarefa atualizada
        updated_task = conn.execute(
            'SELECT * FROM tasks WHERE id = ?', (task_id,)
        ).fetchone()
        conn.close()
        
        return jsonify({
            'id': updated_task['id'],
            'title': updated_task['title'],
            'description': updated_task['description'],
            'due_date': updated_task['due_date'],
            'status': updated_task['status'],
            'priority': updated_task['priority'],
            'category': updated_task['category'],
            'created_at': updated_task['created_at'],
            'updated_at': updated_task['updated_at']
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(current_user, task_id):
    try:
        conn = get_db_connection()
        
        # Verificar se a tarefa existe e pertence ao usuário
        if current_user is None:
            task = conn.execute(
                'SELECT * FROM tasks WHERE id = ? AND user_id IS NULL', (task_id,)
            ).fetchone()
        else:
            task = conn.execute(
                'SELECT * FROM tasks WHERE id = ? AND user_id = ?', (task_id, current_user)
            ).fetchone()
        
        if not task:
            conn.close()
            return jsonify({'message': 'Tarefa não encontrada'}), 404
        
        conn.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Tarefa excluída com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

# Rota para estatísticas
@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    try:
        conn = get_db_connection()
        
        if current_user is None:
            # Estatísticas para usuário não logado
            total_tasks = conn.execute(
                'SELECT COUNT(*) as count FROM tasks WHERE user_id IS NULL'
            ).fetchone()['count']
            
            completed_tasks = conn.execute(
                'SELECT COUNT(*) as count FROM tasks WHERE user_id IS NULL AND status = "completed"'
            ).fetchone()['count']
            
            pending_tasks = conn.execute(
                'SELECT COUNT(*) as count FROM tasks WHERE user_id IS NULL AND status = "pending"'
            ).fetchone()['count']
            
            overdue_tasks = conn.execute(
                '''SELECT COUNT(*) as count FROM tasks 
                   WHERE user_id IS NULL AND status = "pending" 
                   AND due_date < datetime('now')'''
            ).fetchone()['count']
        else:
            # Estatísticas para usuário logado
            total_tasks = conn.execute(
                'SELECT COUNT(*) as count FROM tasks WHERE user_id = ?', (current_user,)
            ).fetchone()['count']
            
            completed_tasks = conn.execute(
                'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = "completed"',
                (current_user,)
            ).fetchone()['count']
            
            pending_tasks = conn.execute(
                'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = "pending"',
                (current_user,)
            ).fetchone()['count']
            
            overdue_tasks = conn.execute(
                '''SELECT COUNT(*) as count FROM tasks 
                   WHERE user_id = ? AND status = "pending" 
                   AND due_date < datetime('now')''',
                (current_user,)
            ).fetchone()['count']
        
        conn.close()
        
        return jsonify({
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'overdue_tasks': overdue_tasks,
            'completion_rate': round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

# Rota de configurações
@app.route('/api/settings', methods=['GET'])
@token_required
def get_settings(current_user):
    try:
        if current_user is None:
            # Configurações padrão para usuário não logado
            return jsonify({
                'theme': 'dark',
                'notifications': True,
                'language': 'pt-BR',
                'timezone': 'America/Sao_Paulo'
            }), 200
        
        conn = get_db_connection()
        settings = conn.execute(
            'SELECT * FROM user_settings WHERE user_id = ?', (current_user,)
        ).fetchone()
        conn.close()
        
        if not settings:
            return jsonify({
                'theme': 'dark',
                'notifications': True,
                'language': 'pt-BR',
                'timezone': 'America/Sao_Paulo'
            }), 200
        
        return jsonify({
            'theme': settings['theme'],
            'notifications': settings['notifications'],
            'language': settings['language'],
            'timezone': settings['timezone']
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

@app.route('/api/settings', methods=['PUT'])
@token_required
def update_settings(current_user):
    try:
        if current_user is None:
            return jsonify({'message': 'Login necessário para salvar configurações'}), 401
        
        data = request.get_json()
        
        conn = get_db_connection()
        
        # Verificar se já existem configurações
        existing = conn.execute(
            'SELECT id FROM user_settings WHERE user_id = ?', (current_user,)
        ).fetchone()
        
        if existing:
            # Atualizar configurações existentes
            conn.execute(
                '''UPDATE user_settings 
                   SET theme = ?, notifications = ?, language = ?, timezone = ?
                   WHERE user_id = ?''',
                (data.get('theme', 'dark'), 
                 data.get('notifications', True),
                 data.get('language', 'pt-BR'),
                 data.get('timezone', 'America/Sao_Paulo'),
                 current_user)
            )
        else:
            # Criar novas configurações
            conn.execute(
                '''INSERT INTO user_settings (user_id, theme, notifications, language, timezone)
                   VALUES (?, ?, ?, ?, ?)''',
                (current_user,
                 data.get('theme', 'dark'),
                 data.get('notifications', True),
                 data.get('language', 'pt-BR'),
                 data.get('timezone', 'America/Sao_Paulo'))
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Configurações salvas com sucesso'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Erro interno: {str(e)}'}), 500

# Rota raiz - Interface do usuário
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint para verificar se a API está funcionando"""
    return jsonify({
        'status': 'OK',
        'message': 'Life Planner API está funcionando'
    })

if __name__ == '__main__':
    init_db()
    print("🚀 Life Planner Backend iniciado!")
    print("📊 Banco de dados SQLite configurado")
    print("🌐 API disponível em: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)