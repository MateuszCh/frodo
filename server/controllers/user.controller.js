const User = require('./../models/user'),
      bcrypt = require('bcryptjs'),
      Counter = require('./../models/counter'),
      passport = require('passport'),
      LocalStrategy = require('passport-local').Strategy,
      config = require('../../config');

passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new LocalStrategy((username, password, done) => {
    User.findOne({username: username})
        .then(user => {
            if(!user) {
                return done(null, false, {message: 'Incorrect username'});
            }
            bcrypt.compare(password, user.password)
                .then(response => {
                    if(!response){
                        return done(null, false, {message: 'Incorrect password'});
                    } else {
                        return done(null, user);
                    }
                })
                .catch(err => done(err));
        })
        .catch(err => {
            return done(err);
        })
}));

module.exports = {
  login(req, res, next){
      passport.authenticate('local', (err, user, info) => {
          if(err) return next(err);
          if(!user) return res.status(401).send(info.message);
          req.logIn(user, err => {
              if(err) return next(err);
              return res.send({username: user.username, id: user.id});
          });
      })(req, res, next);
  },
  logout(req, res, next){
      req.logout();
      res.send('user logged out');
  },
  exist(req, res, next){
      User.findOne({})
          .then(user => res.send(!!user))
          .catch(next);
  },
  isAuthenticated(req, res, next){
      if(req.user){
          res.send('Authenticated');
      } else {
          res.status(401).send({error: 'unauthorized'});
      }
  },
  getUser(req, res, next){
      if(req.user){
          res.send({username: req.user.username, id: req.user.id});
      } else {
          res.send(undefined);
      }
  },
  changePassword(req, res, next){
    const {id, password, newPassword, newPasswordConfirmation} = req.body;
    if(id && password && newPassword && newPasswordConfirmation && (newPasswordConfirmation === newPassword) && (password !== newPassword)){
        User.findOne({id: id})
            .then(user => {
                if(user) {
                    bcrypt.compare(password, user.password)
                        .then(response => {
                            if(!response){
                                res.status(401).send({error: 'Wrong password'});
                            } else {
                                bcrypt.genSalt(12, (err, salt) => {
                                    bcrypt.hash(newPassword, salt, (err, hash) => {
                                        user.password = hash;

                                        user.save()
                                            .then(() => res.send('Password changed'))
                                            .catch(next);
                                    })
                                })
                            }
                        })
                        .catch(next);
                } else {
                    res.status(400).send({error: `There is no user with id: ${id}`})
                }
            })
            .catch(next);
    } else {
        res.status(400).send({error: 'Incorrect data'});
    }
  },
  createUsers(){
      const users = config.users.filter(user => user.username && user.password);
      if(users.length){
          const usersPromises = users.map(user => {
              return User.findOne({username: user.username})
          });
          Promise.all(usersPromises)
              .then(response => {
                  const usersToCreate = response.map((user, i) => !user && i).filter(i => i || i === 0);
                  if(usersToCreate.length){
                      Counter.findOne({})
                          .then(counter => {
                              console.log(usersToCreate);
                              usersToCreate.forEach((user, i) => {
                                  bcrypt.genSalt(12, (err, salt) => {
                                      bcrypt.hash(users[user].password, salt, (err, hash) => {
                                          User.create({
                                              username: users[user].username,
                                              password: hash,
                                              id: counter.counter + i
                                          }).then(userCreated => {
                                              console.log(`${userCreated.username} user was successfully created`);
                                          }).catch(err => {
                                              console.log(users[user]);
                                              console.log(err);
                                          })
                                      })
                                  })
                              });
                              Counter.update(counter, {$inc: {counter: usersToCreate.length}})
                                  .then(counter => console.log("Counter incremented"))
                                  .catch(err => console.log(err));
                          })
                          .catch(err => console.log(err));
                  } else {
                      console.log('There is no users to create');
                  }
              })
              .catch(err => console.log(err));
      } else {
          console.log('There is no correct user in config');
      }

      // User.findOne({})
      //     .then(user => {
      //         if(user === null){
      //             if(config && config.admin && config.admin.username && config.admin.password){
      //                 Counter.findOne({})
      //                     .then(counter => {
      //                         bcrypt.genSalt(12, (err, salt) => {
      //                             bcrypt.hash(config.admin.password, salt, (err, hash) => {
      //                                 User.create({
      //                                     username: config.admin.username,
      //                                     password: hash,
      //                                     id: counter.counter
      //                                 }).then(() => {
      //                                     console.log('User created');
      //                                     Counter.update(counter, {$inc: {counter: 1}})
      //                                         .then(() => console.log("Counter incremented"))
      //                                         .catch(err => console.log(err));
      //                                 }).catch(err => {
      //                                     console.log(err);
      //                                 })
      //                             })
      //                         })
      //                     })
      //                     .catch(err => console.log(err));
      //             } else {
      //                 console.log('incorrect config');
      //             }
      //         } else {
      //             console.log('user already exists');
      //         }
      //     })
      //     .catch(err => console.log(err));
  }
};


// register(req, res, next){
//   const {user, password} = req.body;
//   req.checkBody('user', 'Name is required').notEmpty();
//   req.checkBody('password', 'Password is required').notEmpty();
//   req.checkBody('confirmationPassword', 'Confirmation password is required').notEmpty();
//   req.checkBody('confirmationPassword', 'Passwords do not match').equals(req.body.password);
//   const errors = req.validationErrors();
//   if(errors){
//       res.status(401).send(errors);
//   } else {
//       bcrypt.genSalt(12, (err, salt) => {
//           bcrypt.hash(password, salt, (err, hash) => {
//               User.create({
//                   user: user,
//                   password: hash
//               })
//                   .then(response => {
//                       res.send(response);
//                   })
//                   .catch(next);
//
//           })
//       });
//   }
// },