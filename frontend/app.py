from flask import Flask, render_template


app = Flask(__name__)



@app.route('/')
def index():
    return render_template('index.html')


@app.route('/login')
def login():
    return render_template('login.html')


@app.route('/register')
def register():
    return render_template('register.html')



@app.route('/customer')
def customer():
    return render_template('customer.html')


@app.route('/manager')
def manager():
    return render_template('manager.html')


@app.route('/admin')
def admin():
    return render_template('admin.html')



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)