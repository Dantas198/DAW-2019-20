var express = require('express');
var router = express.Router();
var passport = require('passport');

var apiReq = require('../utils/api');

/* To handle multipat/form-data requests */
const FormData = require('form-data');
const multer = require('multer');
const upload = multer();
var bcrypt = require('bcryptjs');


function checkAuth(req,res,next) {
  if(req.isAuthenticated()){
    next();
  } else {
    res.redirect("/login");
  }
}


/* GET home page. */
router.get('/', checkAuth, function(req, res) {
  let tag = req.query.tag
  let user = req.user
  let search = req.query.search

  if(search && search != null && search != ''){
      let match = search.match(/(.+):(.+)/)
      console.log(search)
      console.log("match " + match)
      if(match){
          apiReq.get('/api/post/fuzzy/' + match[1] + '/' + match[2])
              .then(dados => {console.log(dados.data); res.render('index', {lista: dados.data, user: user})})
              .catch(erro => res.render('error', {error: e}))
      }else{
          apiReq.get('/api/post/fuzzy/title/' + search)
              .then(dados => {console.log(dados.data); res.render('index', {lista: dados.data, user: user})})
              .catch(erro => res.render('error', {error: e}))
      }
  } else if(tag){
    apiReq.get('/api/posts/tag/'+ tag)
      .then(dados => { res.render('index', {lista: dados.data, user: user})})
      .catch(e => res.render('error', {error: e}))
  } else {
    apiReq.get('/api/posts')
      .then(dados => { res.render('index', {lista: dados.data, user: user})})
      .catch(e => res.render('error', {error: e}))
  }
});


// login
router.post('/', function(req, res){
  res.redirect('/login')
});

router.get('/login', function(req, res) {
  res.render('login');
});

router.post('/login', passport.authenticate('local', {  
    successRedirect: '/',
    successFlash: 'Utilizador autenticado com sucesso!',
    failureRedirect: '/login',
    failureFlash: 'Utilizador ou password inválido(s)...'
  })
);

router.get('/profile/:name', checkAuth, function(req, res){
  apiReq.get('/users/name/' + req.params.name)
    .then(user => {console.log("USER: " +req.user); console.log("Profile:" + user.data);res.render('user', {user: req.user, userProfile: user.data})})
    .catch(erro => res.status(500).render('error', {error: erro}) )
})

// register
router.get('/register', function(req, res){
  res.render('register');
});

router.post('/register', function(req, res){
  let hash = bcrypt.hashSync(req.body.password, 10);
  apiReq.post('/users', {
    email: req.body.email,
    password: hash,
    name: req.body.name
  })
  .then(_ => res.redirect('/login') )
  .catch(erro => {
    console.log(erro.response.data); 
    if(erro.response.data.erro == 'email' || erro.response.data.erro == 'name')
      res.render('register', {erro: erro.response.data.erro})
    else
      res.status(500).render('error', {error: erro})})
})

router.post('/subscription/:name', /*checkAuth,*/ function(req, res){
  console.log(req.body.text)
  let sub = req.body.text
  if(req.user.subscriptions.includes(sub))
    res.redirect('/profile/'+ req.params.name)
  else{
    apiReq.post('/users/' + req.params.name + '/subscription/' + sub)
      .then(user => res.redirect('/profile/'+ req.params.name))
      .catch(erro => res.status(500).render('error', {error: erro}))
  }
})

router.post('/profile/:name/image', upload.single('img'), /*checkAuth,*/ function(req, res){
  let form = new FormData()
  let name = req.params.name
  form.append('img', req.file.buffer, req.file.originalname)
  apiReq.post('/users/userImg/' + name, form,{
    headers: {
      'Content-Type': 'multipart/form-data; boundary='+form._boundary
    }
  })
  .then(user => res.redirect('/profile/'+ name))
  .catch(erro => res.status(500).render('error', {error: erro}))
})

router.delete('/subscription/:name/tag/:sub', /*checkAuth,*/ function(req, res){
  apiReq.delete('/users/' + req.params.name + '/subscription/' + req.params.sub)
    .then(user => res.jsonp(user.email))
    .catch(erro => res.status(500).render('error', {error: erro}) )
})

// publish
router.get('/publish', checkAuth, function(req, res){
  let user = req.user
  res.render('publish', {user: user})
})

router.post('/publish', upload.array('files'), /* checkAuth,*/ function(req, res){
  let form = new FormData()
  form.append('title', req.body.title)
  form.append('description', req.body.description)
  req.files.forEach(file => {
    form.append('files' , file.buffer, file.originalname)
  })
  apiReq.post('/api/post', form, {
    headers: {
      'Content-Type': 'multipart/form-data; boundary='+form._boundary
    }
  })
  .then(dados => res.redirect('/'))
  .catch(erro => res.status(500).render('error', {error: erro}))
})

router.post('/comment/:idPost/:email', function(req,res){
  req.body.owner = req.params.email
  apiReq.post('/api/comment/' + req.params.idPost, req.body)
    .then(dados => res.redirect('/post/' + req.params.idPost))
    .catch(erro => res.status(500).render('error', {error: erro}))
})

/**
 * Respondes to axios in client side
 */
router.post('/comment/upvote/:idComment/:email', function(req, res){
  apiReq.post('/api/comment/upvote/' + req.params.idComment +'/' + req.params.email)
    .then(dados => { res.jsonp(dados.data)})
    .catch(erro => res.status(500).render('error', {error: erro}))
})

/**
 * Respondes to axios in client side
 */
router.post('/comment/downvote/:idComment/:email', function(req, res){
  apiReq.post('/api/comment/downvote/' + req.params.idComment +'/' + req.params.email)
    .then(dados => { res.jsonp(dados.data)})
    .catch(erro => res.status(500).render('error', {error: erro}))
})

router.get('/logout', function(req,res){
  req.logout()
  res.redirect('/')
})

module.exports = router;
