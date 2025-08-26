import os
import json
import sqlite3
import requests
from datetime import datetime, timezone 
from flask import Flask, request, jsonify, send_from_directory, session
from werkzeug.security import generate_password_hash, check_password_hash

# Serve index.html from repo root (keep if your index.html is at project root)
app = Flask(__name__, static_folder='', static_url_path='')

# Secrets from env
app.secret_key = os.getenv("SECRET_KEY", "dev-key")

# Cookie/session settings (needed if frontend is on a different domain over HTTPS)
app.config.update(
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=True
)

# Database path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, 'database.db')

def get_api_key():
    return os.getenv("OPENAI_API_KEY")




def init_db():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                datetime TEXT NOT NULL,
                amount REAL NOT NULL,
                user_id INTEGER
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            )
        ''')
        conn.commit()

init_db()

# Insert common categories
def insert_default_categories():
    categories = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Savings']
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        for category in categories:
            cursor.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (category,))
        conn.commit()

insert_default_categories()

# Serve the index page
@app.route('/')
def index():
    return send_from_directory(app.static_folder or '.', 'index.html')


#//////////////////////////////////////////////////////////////////////////////////////////////////
#////////////////////////                  ADD EXPENSES                  //////////////////////////
#//////////////////////////////////////////////////////////////////////////////////////////////////
@app.route('/api/expenses', methods=['POST'])
def add_expenses():
    data = request.get_json()
    user_input = data.get('userInput', '').strip()
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    # Print the voice input received from the frontend
    print(f"\n💭 User Input: {user_input}")
    # Ensure the input is not empty
    if not user_input:
        return jsonify({'error': 'No input received'}), 400

    # Prompt for ChatGPT
    prompt = (
        "Let's say you have an expense tracker app. It applies text analysis on the user's input and tries to figure out what expenses the text contains."
        "From the next input text, give me a JSON array of the expenses you figured out."
        "Check for each expense and try to associate it to one of the following categories: Food, Transport, Entertainment, Shopping, Bills, Health, Education."
        "If the language is not English, tranlate everything to english."
        "If none match, return 'Uncategorized'."
        "Your response must be in this exact form with keys 'name', 'category', and 'amount'."
        "For example: "
        "[{\"name\": \"coffee\", \"category\": \"Food\", \"amount\": 5}, "
        "{\"name\": \"house rent\", \"category\": \"Bills\", \"amount\": 450}]. "
        "Do not include any additional text. The input text is this: " + user_input
    )

    openai_api_key = get_api_key()
    if not openai_api_key:
        return jsonify({'error': 'OPENAI_API_KEY is not set'}), 500

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {openai_api_key}"
    }

    payload = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        return jsonify({'error': 'Failed to contact OpenAI', 'details': str(e)}), 500

    response_data = response.json()
    try:
        chat_response = response_data["choices"][0]["message"]["content"]
        print("🤖 GPT Response:", chat_response)  # Log full GPT response
        expenses_list = json.loads(chat_response)
    except (KeyError, json.JSONDecodeError) as e:
        return jsonify({'error': 'Failed to parse ChatGPT response', 'details': str(e)}), 500
    # Validate and process expenses
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    valid_expenses = []
    for expense in expenses_list:
        if not isinstance(expense, dict):
            print("Skipping: Invalid format (not a dictionary)", expense)
            continue
        name = expense.get('name', '').strip().capitalize()
        category = expense.get('category', 'Uncategorized').strip()
        amount = expense.get('amount')

        # Validate name and category
        if not name or not isinstance(name, str):
            print(f"Skipping: Invalid name '{name}'")
            continue
        if not category or not isinstance(category, str):
            print(f"Skipping: Invalid category '{category}'")
            continue

        # Validate amount (must be a positive number)
        if amount is None or isinstance(amount, str) or not isinstance(amount, (int, float)) or amount != amount or amount <= 0:
            print(f"Skipping: Invalid amount '{amount}' (must be positive)")
            continue

        print(f"Valid Expense: {name} - {category} - {amount}€")
        valid_expenses.append((name, category, amount))

    # Insert only valid expenses into the database
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        added_expenses = 0

        for name, category, amount in valid_expenses:
            now = datetime.now(timezone.utc).isoformat()
            cursor.execute("INSERT INTO expenses (name, category, datetime, amount, user_id) VALUES (?, ?, ?, ?, ?)",
               (name, category, now, amount, user_id))

            added_expenses += 1

        conn.commit()

    return jsonify({'status': 'success', 'expenses_added': added_expenses})



# API endpoint to retrieve stored expenses
@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        
        # only fetch this user’s expenses
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        cursor.execute(
            "SELECT id, name, category, datetime, amount FROM expenses WHERE user_id = ? ORDER BY datetime DESC",
            (user_id,)
        )

        rows = cursor.fetchall()
        expenses = [{'id': row[0], 'name': row[1], 'category': row[2], 'datetime': row[3], 'amount': row[4]} for row in rows]
    return jsonify(expenses)

# API endpoint to delete an expense
@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        cursor.execute(
            "DELETE FROM expenses WHERE id = ? AND user_id = ?",
            (expense_id, user_id)
        )
        conn.commit()
    return jsonify({'status': 'success', 'message': f'Expense {expense_id} deleted'})

# API endpoint to get category totals
@app.route('/api/categories', methods=['GET'])
def get_category_totals():
    year = request.args.get('year')   # e.g. "2025"
    month = request.args.get('month') # e.g. "03"
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()

        # scope by user, then optionally by year/month
        query = "SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ?"
        params = [user_id]
        if year and month:
            query += " AND strftime('%Y', datetime)=? AND strftime('%m', datetime)=?"
            params += [year, month]
        query += " GROUP BY category"

        cursor.execute(query, params)
        rows = cursor.fetchall()

    category_totals = [{'category': row[0], 'total': row[1]} for row in rows]
    return jsonify(category_totals)




#//////////////////////////////////////////////////////////////////////////////////////////////////
#////////////////////////          WRAP UP EXPENSES AND REPORT           //////////////////////////
#//////////////////////////////////////////////////////////////////////////////////////////////////
@app.route('/api/wrap-up', methods=['POST'])
def wrap_up_expenses_and_report():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        cursor.execute("SELECT name, category, amount, datetime FROM expenses WHERE user_id = ? ORDER BY datetime DESC", (user_id,))
        expenses = cursor.fetchall()

    if not expenses:
        return jsonify({'error': 'No expenses found'}), 400

    expense_summary = "\n".join([f"{e[0]} ({e[1]}): {e[2]}€ on {e[3]}" for e in expenses])


    data_for_consult = request.get_json()
    question_for_consult = data_for_consult.get('userInputForConsult', '').strip()


    prompt_wrap = ("I will give you my total expenses database, and a question. So provide me the answer (in about 50 words). "
    "If the question is not related to the database then you should NOT answer! Respond as: Please enter a question related to your expenses."
    "If you are going to provide dates transform them to a human readable format."
    "My expenses are these: \n" + expense_summary + 
    "My question is this: \n" + question_for_consult )

    #print("🤖 Wraped expenses to GPT:\n", expense_summary)
    print("🤖 Prompt to GPT:\n", prompt_wrap)

    openai_api_key = get_api_key()
    if not openai_api_key:
        return jsonify({'error': 'OPENAI_API_KEY is not set'}), 500

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {openai_api_key}"
    }
    payload = {
        "model": "gpt-4",
        "messages": [{"role": "user", "content": prompt_wrap}]
    }
    try:
        response = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        response_data = response.json()
        chat_response = response_data["choices"][0]["message"]["content"]
        return jsonify({'response': chat_response})
    except requests.exceptions.RequestException as e:
        return jsonify({'error': 'Failed to contact OpenAI', 'details': str(e)}), 500


#//////////////////////////////////////////////////////////////////////////////////////////////////
#////////////////////////                REGISTER ROUTE                  //////////////////////////
#//////////////////////////////////////////////////////////////////////////////////////////////////
from werkzeug.security import generate_password_hash

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    full_name = data.get('full_name')
    username = data.get('username')
    password = data.get('password')
    if not username or not password or not full_name:
        return jsonify({'status': 'error', 'error': 'Missing full name, username, or password'}), 400

    with sqlite3.connect(DATABASE) as conn:   # << use DATABASE
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
        if cursor.fetchone():
            return jsonify({'status': 'error', 'error': 'Username already exists'}), 409

        password_hash = generate_password_hash(password)
        cursor.execute('INSERT INTO users (full_name, username, password_hash) VALUES (?, ?, ?)',
                       (full_name, username, password_hash))
        conn.commit()
    return jsonify({'status': 'success'}), 200
    

#//////////////////////////////////////////////////////////////////////////////////////////////////
#////////////////////////                  LOGIN ROUTE                   //////////////////////////
#//////////////////////////////////////////////////////////////////////////////////////////////////
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, full_name, password_hash FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

    if not user or not check_password_hash(user[2], password):
        return jsonify({'error': 'Invalid username or password'}), 401
    session['user_id'] = user[0]
    return jsonify({'status': 'success', 'message': 'Logged in', 'full_name': user[1]})


#//////////////////////////////////////////////////////////////////////////////////////////////////
#////////////////////////                  LOGOUT ROUTE                  //////////////////////////
#//////////////////////////////////////////////////////////////////////////////////////////////////
@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'success', 'message': 'Logged out'})



#//////////////////////////////////////////////////////////////////////////////////////////////////
#////////////////////////                    __main__                    //////////////////////////
#//////////////////////////////////////////////////////////////////////////////////////////////////
if __name__ == '__main__':
    port = int(os.getenv("PORT", "8000"))
    app.run(host='0.0.0.0', port=port)
