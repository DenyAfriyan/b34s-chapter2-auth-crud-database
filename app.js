// pemanggilan package express
const express = require('express');

const app = express();
const port = 5000;
// import db connection
const db = require('./connection/db');

//import file upload
const upload = require('./middlewares/uploadFile');

// import package bcrypt
const bcrypt = require('bcrypt');

// import package express-session and express-flash
const flash = require('express-flash');
const session = require('express-session');

app.use('/public', express.static(__dirname + '/public'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.set('view engine', 'hbs');
app.use(express.urlencoded({ extended: false }));

// use express-flash
app.use(flash());

app.use(
  session({
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 1000 * 60 * 60 * 2,
    },
    store: new session.MemoryStore(),
    saveUninitialized: true,
    resave: false,
    secret: 'secretValue',
  })
);

//show data with database
app.get('/', (req, res) => {
  let query = '';
  if (req.session.isLogin) {
    query = `SELECT name,image,author,tb_project.id,title,description,technologies,duration,start_date,end_date,detail_date
              From tb_project
              LEFT JOIN tb_user
              ON tb_user.id = tb_project.author
              where author = ${req.session.user.id}
              ORDER BY id DESC;`;
  } else {
    query = `SELECT name,image,author,tb_project.id,title,description,technologies,duration,start_date,end_date,detail_date
              From tb_project
              LEFT JOIN tb_user
              ON tb_user.id = tb_project.author
              ORDER BY id DESC;`;
  }

  db.connect((err, client, done) => {
    if (err) throw err;

    client.query(query, (err, result) => {
      done();
      if (err) throw err;

      let data = result.rows;
      data = data.map((project) => {
        return {
          ...project,
          isLogin: req.session.isLogin,
        };
      });

      console.log(data);
      console.log(req.session.isLogin);
      res.render('index', { project: data, isLogin: req.session.isLogin, user: req.session.user });
    });
  });
});

app.get('/add-project', (req, res) => {
  res.render('add-project', { isLogin: req.session.isLogin, user: req.session.user });
});

app.post('/add-project', upload.single('image'), (req, res) => {
  let title = req.body.title;
  let description = req.body.description;
  let startDate = req.body.startDate;
  let endDate = req.body.endDate;
  let technologies = req.body.technologies;

  let project = {
    title: title,
    description: description,
    startDate: startDate,
    author: req.session.user.id,
    endDate: endDate,
    duration: getTime(startDate, endDate),
    technologies: technologies,
    image: req.file.filename,
    detailDate: getDetailDate(startDate, endDate),
  };

  db.connect((err, client, done) => {
    let query = `INSERT INTO tb_project(title,description,start_date,end_date,technologies,image,duration,detail_date,author) VALUES ('${project.title}','${project.description}','${project.startDate}','${project.endDate}','{${project.technologies}}','${project.image}','${project.duration}','${project.detailDate}','${project.author}') `;
    if (err) throw err;

    client.query(query, (err, result) => {
      done();
      if (err) throw err;

      console.log(result);
      res.redirect('/');
    });
  });
});

app.get('/edit-project/:id', function (req, res) {
  let id = req.params.id;
  db.connect((err, client, done) => {
    if (err) throw err;

    let query = `SELECT * FROM tb_project WHERE id=${id}`;
    client.query(query, (err, result) => {
      done();
      if (err) throw err;

      let data = result.rows[0];
      data.start_date = formatDate(data.start_date);
      data.end_date = formatDate(data.end_date);

      function include(arr, obj) {
        for (var i = 0; i < arr.length; i++) {
          if (arr[i] == obj) return true;
        }
      }

      let tech = {
        nodeJs: include(data.technologies, 'nodeJs.svg'),
        reactJs: include(data.technologies, 'reactJs.svg'),
        nextJs: include(data.technologies, 'nextJs.svg'),
        typescript: include(data.technologies, 'typeScript.svg'),
      };

      console.log(tech);
      res.render('edit-project', { project: data, tech: tech, isLogin: req.session.isLogin, user: req.session.user });
    });
  });
});

app.post('/edit-project/:id', upload.single('image'), (req, res) => {
  let id = req.params.id;
  let title = req.body.title;
  let description = req.body.description;
  let startDate = req.body.startDate;
  let endDate = req.body.endDate;
  let technologies = req.body.technologies;

  let project = {
    title: title,
    description: description,
    startDate: startDate,
    endDate: endDate,
    duration: getTime(startDate, endDate),
    technologies: technologies,
    image: req.file.filename,
    detailDate: getDetailDate(startDate, endDate),
  };
  db.connect((err, client, done) => {
    if (err) throw err;

    let query = `UPDATE tb_project SET title='${project.title}',description='${project.description}',start_date='${project.startDate}',duration='${project.duration}',end_date='${project.endDate}',detail_date='${project.detailDate}',technologies =  '{${project.technologies}}', image='${project.image}' WHERE id=${id}`;

    client.query(query, (err, result) => {
      done();
      if (err) throw err;

      res.redirect('/');
    });
  });
});

app.get('/delete-project/:id', function (req, res) {
  let id = req.params.id;

  db.connect((err, client, done) => {
    if (err) throw err;

    let query = `DELETE FROM tb_project WHERE id=${id}`;

    client.query(query, (err, result) => {
      done();
      if (err) throw err;

      res.redirect('/');
    });
  });
});

app.get('/contact', (req, res) => {
  res.render('contact', { isLogin: req.session.isLogin, user: req.session.user });
});

app.get('/detail-project/:id', function (req, res) {
  let id = req.params.id;
  db.connect((err, client, done) => {
    if (err) throw err;
    let query = `SELECT * FROM tb_project WHERE id = ${id}`;
    client.query(query, (err, result) => {
      done();
      if (err) throw err;
      result = result.rows[0];
      res.render('detail-project', { project: result, isLogin: req.session.isLogin, user: req.session.user });
    });
  });
});

app.get('/register', (req, res) => {
  res.render('register', { isLogin: req.session.isLogin, user: req.session.user });
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const hash = bcrypt.hashSync(password, 10);

  db.connect((err, client, done) => {
    if (err) throw err;

    let query = `INSERT INTO tb_user(name, email, password) VALUES ('${name}','${email}','${hash}')`;

    client.query(query, (err, result) => {
      done();
      if (err) throw err;

      req.flash('success', 'Your account successfully registered');
      res.redirect('/login');
    });
  });
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.connect((err, client, done) => {
    if (err) throw err;

    let query = `SELECT * FROM tb_user WHERE email='${email}'`;
    client.query(query, (err, result) => {
      done();
      if (err) throw err;

      if (result.rowCount == 0) {
        req.flash('danger', 'account not found');
        return res.redirect('/login');
      }

      let isMatch = bcrypt.compareSync(password, result.rows[0].password);

      if (isMatch) {
        req.session.isLogin = true;
        req.session.user = {
          id: result.rows[0].id,
          name: result.rows[0].name,
          email: result.rows[0].email,
        };

        req.flash('success', 'Login success');
        res.redirect('/');
      } else {
        req.flash('danger', 'Password doesnt match with your account');
        res.redirect('/login');
      }
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`App Listening to port ${port}`);
});

function getTime(d1, d2) {
  const dateOne = new Date(d1);
  const dateTwo = new Date(d2);
  console.log(dateOne);
  console.log(dateTwo);
  const time = Math.abs(dateTwo - dateOne);
  console.log(time);
  const month = Math.ceil(time / (1000 * 60 * 60 * 24 * 30));
  const year = Math.floor(time / (1000 * 60 * 60 * 24 * 30 * 12));

  if (month < 12) {
    return `${month} Bulan`;
  } else {
    return `${year} tahun`;
  }
}
const month = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getDetailDate(d1, d2) {
  const dateOne = new Date(d1);
  const dateTwo = new Date(d2);

  const startDate = dateOne.getDate();
  const startMonthIndex = dateOne.getMonth();
  const startYear = dateOne.getFullYear();

  const endDate = dateTwo.getDate();
  const endMonthIndex = dateTwo.getMonth();
  const endYear = dateTwo.getFullYear();

  return `${startDate} ${month[startMonthIndex]} ${startYear} - ${endDate} ${month[endMonthIndex]} ${endYear}`;
}

function formatDate(date) {
  var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}
