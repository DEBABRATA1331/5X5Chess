from flask import Flask, render_template

app = Flask(__name__, template_folder="templates", static_folder="statics")

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/vs-computer')
def vs_computer():
    return render_template('index.html')

@app.route('/vs-friend')
def vs_friend():
    return render_template('vs-friend.html')

if __name__ == '__main__':
    app.run(debug=True)
