const express = require('express');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
const session = require('express-session');
const { Pool, Client } = require('pg');
var pgtools = require('pgtools');
const app = express();
app.use(cookieParser());
app.use(session({
    secret: 'secret discret',
    saveUninitialized: true,
    resave: false
}));
const port = 6789;

// db related code
const config = {
    user: "postgres",
    host: "localhost",
    password: "1234",
    port: 5432
};

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'task',
    password: '1234',
    port: 5432,
});

const queryInserTable = `INSERT INTO task(
    titlu, descriere, status
    ) VALUES ('Titlu 1', 'o descriere foarte relevanta', 'ToDo'),
    ('Titlu 2', 'o descriere relevanta numarul 2', 'In Progress'),
    ('Titlu 3', 'Descriere pentru titlu 3', 'Done'),
    ('Titlu 3', 'Pupici Ilinca', 'In Progress'),
    ('Titlu 5', 'Alti pupici Ilincuta', 'Done'),
    ('Titlu 6', 'Alti pupici Ilincuta', 'Done');`;

const querySelectFromTable = `SELECT * FROM task;`;

//json files
let utilizatori = {};
let selectFromDB = {};

fs.readFile('./utilizatori.json', 'utf8', (err, data) => {
    if (err) {
        console.log("Error reading file from disk: ", err)
        return
    }
    try {
        utilizatori = JSON.parse(data)
    } catch (err) {
        console.log("Error parsing the JSON string")
    }
});
// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'));
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
// la accesarea din browser adresei http://localhost:6789/ se va returna textul 'Hello World'
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
    client.connect();
    client.query(querySelectFromTable, (err, res) => {
            if (err) {
                console.error(err);
                return;
            }

            selectFromDB = JSON.parse(JSON.stringify(res.rows));
        });
        
    res.render('index', {
        user: req.session.name,
        selectFromDB: selectFromDB,
        mesajAdmin: req.cookies.mesajAdmin
    });
});


app.get('/autentificare', (req, res) => {
    res.render('autentificare', { mesajEroare: req.cookies.mesajEroare });
});

app.get('/admin', (req, res) => {
   if (req.session.name == 'admin') {
       res.render('admin');
   } 
   else{
       res.cookie('mesajAdmin', 'User is not admin');
       res.redirect(302,'/');
       res.end();
   }
});

app.post('/verificare-autentificare', (req, res) => {
    var loggedInCredentials = JSON.parse(JSON.stringify(req.body));
    for (i in utilizatori) {
        if (loggedInCredentials.name == utilizatori[i].nume && loggedInCredentials.pwd == utilizatori[i].password) {
            req.session.name = loggedInCredentials.name;
            res.cookie('name', loggedInCredentials.name);
            res.redirect(302, '/');
            res.end();
        }
    }
    if (req.session.name == null) {
        res.cookie('mesajEroare', 'Credentiale invalide');
        res.redirect(302, '/autentificare');
        res.end();
    }
});

app.get('/logout', function (req, res, next) {
    if (req.session) {
        req.session.destroy(function (err) {
            if (err) {
                return next(err);
            } else {
                res.clearCookie('name');
                res.clearCookie('mesajAdmin');
                res.clearCookie('mesajEroare');
                res.cookie('name','', {expires: new Date(Date.now()-1)});
                return res.redirect(302, '/');
            }
        });
    }
});

app.get('/inserare-bd', (req, res) => {
    client.query(queryInserTable, (err, res) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Insert was successfull');
        client.query(querySelectFromTable, (err, res) => {
            if (err) {
                console.error(err);
                return;
            }

            selectFromDB = JSON.parse(JSON.stringify(res.rows));
        });
    });
    res.redirect(302, '/');
});

app.get('/update-bd-:path', (req, res) => {
    const queryUpdate = `UPDATE task SET status='In Progress' WHERE id='` + req.params.path +`';`;
    client.query(queryUpdate, (err, res) => {
        if (err) {
            console.error(err);
            return;
        }
        client.query(querySelectFromTable, (err, res) => {
            if (err) {
                console.error(err);
                return;
            }

            selectFromDB = JSON.parse(JSON.stringify(res.rows));
        });
        console.log('Update was successfull');
    });
    res.redirect(302, '/');
});

app.get('/done-bd-:path', (req, res) => {
    const queryUpdateDone = `UPDATE task SET status='Done' WHERE id='` + req.params.path +`';`;
    client.query(queryUpdateDone, (err, res) => {
        if (err) {
            console.error(err);
            return;
        }
        client.query(querySelectFromTable, (err, res) => {
            if (err) {
                console.error(err);
                return;
            }

            selectFromDB = JSON.parse(JSON.stringify(res.rows));
        });
        console.log('Update was successfull');
    });
    res.redirect(302, '/');
});

app.get('/delete-bd-:path', (req, res) => {
    console.log(req.params.path);
    const queryDelete = `DELETE FROM task WHERE id='` + req.params.path +`';`;
    client.query(queryDelete, (err, res) => {
        if (err) {
            console.error(err);
            return;
        }
        client.query(querySelectFromTable, (err, res) => {
            if (err) {
                console.error(err);
                return;
            }

            selectFromDB = JSON.parse(JSON.stringify(res.rows));
        });
        console.log('Delete was successfull');
    });
    res.redirect(302, '/');
});

app.post('/insert-task-nou', (req, res) => {
    var taskNou = JSON.parse(JSON.stringify(req.body));
    const queryAddTaskNou = `INSERT INTO task(titlu, descriere, status) VALUES ('`+ taskNou.titlu +`','`+ taskNou.descriere +`', 'ToDo');`;
    client.query(queryAddTaskNou, (err, res) => {
        if (err) {
            console.error(err);
            return;
        }
        client.query(querySelectFromTable, (err, res) => {
            if (err) {
                console.error(err);
                return;
            }

            selectFromDB = JSON.parse(JSON.stringify(res.rows));
        });
        console.log('Insert was successfull');
    });
    res.redirect(302, '/');});

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));