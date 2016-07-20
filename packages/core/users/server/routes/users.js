'use strict';

// User routes use users controller
var users = require('../controllers/users'),
  config = require('meanio').loadConfig();

var jwt = require('jsonwebtoken'); //https://npmjs.org/package/node-jsonwebtoken

module.exports = function(MeanUser, app, auth, database, passport) {

  app.route('/api/logout')
    .get(users.signout);
  app.route('/api/users/me')
    .get(users.me);

  // Setting up the users api
  app.route('/api/register')
    .post(users.create, users.updateCircles, users.getJwt);

  app.route('/api/forgot-password')
    .post(users.forgotpassword);

  app.route('/api/reset/:token')
    .post(users.resetpassword);

  // Setting up the userId param
  app.param('userId', users.user);

  // AngularJS route to check for authentication
  app.route('/api/loggedin')
    .get(function(req, res) {
      res.send(req.isAuthenticated() ? req.user : '0');
    });

  // Setting the local strategy route
  app.route('/api/login')
    .post(passport.authenticate('local', {
      failureFlash: false
    }), users.updateCircles, users.getJwt);

  // AngularJS route to get config of social buttons
  app.route('/api/get-config')
    .get(function(req, res) {
      // To avoid displaying unneccesary social logins
      var clientIdProperty = 'clientID';
      var defaultPrefix = 'DEFAULT_';
      var socialNetworks = ['facebook', 'linkedin', 'twitter', 'github', 'google']; //ugly hardcoding :(
      var configuredApps = {};
      for (var network in socialNetworks) {
        var netObject = config[socialNetworks[network]];
        if (netObject.hasOwnProperty(clientIdProperty)) {
          if (netObject[clientIdProperty].indexOf(defaultPrefix) === -1) {
            configuredApps[socialNetworks[network]] = true;
          }
        }
      }
      res.send(configuredApps);
    });
    
    // For Nexr function
    var exec = require('child_process').exec;

    // This function responsible on the view to uploads as pdf 
    app.post('/append.js' , function(req, res){
        
        var StartOFPath = '/home/as/Desktop/icu/';
        
        // Check the type of the file, and if needed to viewed as pdf
        if((req.body.attachmentType == "docx") ||
           (req.body.attachmentType == "doc") ||
           (req.body.attachmentType == "xlsx") ||
           (req.body.attachmentType == "xls") ||
           (req.body.attachmentType == "ppt") ||
           (req.body.attachmentType == "pptx"))
        {
            var str = req.body.path;
            
            //Check if there is space, if there is, add '\' before it
            if (str.indexOf(' ') >= 0)
            {
                console.log('space');
                
                var temp1 = str.split(' ');
                var temp2 = temp1[0];
                
                
                for(var i=1; i < temp1.length; i++)
                {
                    
                    temp2 = temp2.concat("\\ " + temp1[i]);
                }
                str = temp2;
            }
            
            //###start_of_url 
            var arr = str.split("http://localhost:3000");
            var realpath = arr[1];
            var arr1 = str.split("/");
            var pathToFolder = arr1[3] + '/' + arr1[4] + '/' + arr1[5] + '/' + arr1[6] + '/';
            var arr2 = arr1[7].split("." + req.body.attachmentType);
    
        console.log('mv ' + StartOFPath + arr2[0] + '.pdf' + ' ' + StartOFPath + pathToFolder + arr2[0] + '.pdf');
        console.log('lowriter --convert-to pdf /home/as/Desktop/icu' + realpath);
        
            // Make the convert from it's origin type to pdf
            exec('lowriter --convert-to pdf /home/as/Desktop/icu' + realpath, function (err, stout, sterr){
            if (err) {
                res.send(500, arguments);
            } else {
                
                // Move the converted file to the path of the origin file
                exec('mv ' + StartOFPath + arr2[0] + '.pdf' + ' ' + StartOFPath + pathToFolder + arr2[0] + '.pdf' , function (err, stout, sterr){
                    if (err) {
                        res.send(500, arguments);
                    } else {
                        
                        res.send(stout);
                    }
                });
                //res.send(stout);
            }
        });
        
    }
    else{
        console.log("OhAd waS HEre");
    };
        
    });
    

  // Setting the facebook oauth routes
  app.route('/api/auth/facebook')
    .get(passport.authenticate('facebook', {
      scope: ['email', 'user_about_me'],
      failureRedirect: '/login'
    }), users.signin);

  app.route('/api/auth/facebook/callback')
    .get(passport.authenticate('facebook', {
      failureRedirect: '/login'
    }), users.authCallback);

  // Setting the github oauth routes
  app.route('/api/auth/github')
    .get(passport.authenticate('github', {
      failureRedirect: '/login'
    }), users.signin);

  app.route('/api/auth/github/callback')
    .get(passport.authenticate('github', {
      failureRedirect: '/login'
    }), users.authCallback);

  // Setting the twitter oauth routes
  app.route('/api/auth/twitter')
    .get(passport.authenticate('twitter', {
      failureRedirect: '/login'
    }), users.signin);

  app.route('/api/auth/twitter/callback')
    .get(passport.authenticate('twitter', {
      failureRedirect: '/login'
    }), users.authCallback);

  // Setting the google oauth routes
  app.route('/api/auth/google')
    .get(passport.authenticate('google', {
      failureRedirect: '/login',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    }), users.signin);

  app.route('/api/auth/google/callback')
    .get(passport.authenticate('google', {
      failureRedirect: '/login'
    }), users.authCallback);

  // Setting the linkedin oauth routes
  app.route('/api/auth/linkedin')
    .get(passport.authenticate('linkedin', {
      failureRedirect: '/login',
      scope: ['r_emailaddress']
    }), users.signin);

  app.route('/api/auth/linkedin/callback')
    .get(passport.authenticate('linkedin', {
      failureRedirect: '/login'
    }), users.authCallback);

};
