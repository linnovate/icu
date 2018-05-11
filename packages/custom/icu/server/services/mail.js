'use strict';

var Q = require('q');
var config = require('meanio').loadConfig();
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var EmailTemplate = require('../../../mail-templates/node_modules/email-templates').EmailTemplate;
var icalToolkit = require('ical-toolkit');
var path = require('path');
var URL = "http://localhost:3002";
var logger = require('./logger')

// node modules for creating PDF files
var officegen = require('officegen');
var async = require ('async');
var fs = require('fs');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var exec = require('child_process').exec;


function send(mailOptions) {
  var options = config.mailer;
  if (config.mailer.service === 'SMTP') {
    options = smtpTransport(options);
  }
  var transport = nodemailer.createTransport(options);
  return Q.ninvoke(transport, 'sendMail', mailOptions);
}

function render(type, data) {
  var templateDir = path.join(__dirname, '..', 'templates', type);
  var template = new EmailTemplate(templateDir);

  return template.render(data);
}

function checkPath(dir,subDir){
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
  if(!fs.existsSync(dir+"/"+subDir)){
      fs.mkdirSync(dir+"/"+subDir)
  }
}


function writeDocxToFile(docx,discussionId){
return new Promise(function (fulfill, reject){
  checkPath('files','notes');
  var path = 'files/notes/'+discussionId+".docx";
  var out = fs.createWriteStream (path);
    out.on ('error', function (err) {
    logger.log('error', 'writeDocxToFile, %s', ' fs.createWriteStream', {error: err.message});
    reject(err);
  });
    docx.generate ( out, {
      'finalize': function ( written ) {
          exec('lowriter --headless --convert-to pdf ' + path, function (err, stout, sterr){
          if(err){
            logger.log('error', 'writeDocxToFile, %s', ' convert-to pdf', {error: err.message});
            reject(err);
            return;
          }
          else{
            exec('mv ' + discussionId + '.pdf' + ' ' + 'files/notes/'+discussionId + '.pdf' , function (err, stout, sterr){
            if (err) {
              logger.log('error', 'writeDocxToFile, %s', ' save pdf file', {error: err.message});
              reject(err);
            } 
            else {          
              fulfill("success");
            }
          });    
          }
          });
    },
      'error': function ( err ) {
          logger.log('error', 'writeDocxToFile, %s', ' docx.generate', {error: err.message});
          reject(err);
      }
  });
});
}

function addTasks(docx,tasks,discussionId,tasksNum){
  return new Promise(function (fulfill, reject){
    if(!tasks || tasks==null || tasks.length==0){
      var assigns = [];
      addTasksToDocx(docx,tasks,assigns,discussionId,tasksNum).then(
        function(result){
          if(result=='success'){
            fulfill('success');
          }
          else{
            logger.log('error', 'addTasks, %s', ' addTasksToDocx', {error: "Unknown Error"});

            reject('error');
          }
        }
      ).catch(function(err){
        logger.log('error', 'addTasks, %s', ' addTasksToDocx', {error: err.message});
        reject(err);

      });
    }
    else{
    var assigns = new Array(tasks.length);
    var i = 0;
    (function func(){
      User.findOne({
      _id: tasks[i].assign
      }).exec(function (err, user) {
        if(err){
          logger.log('error', 'addTasks, %s', ' User.findOne', {error: err.message});
          reject(err);
          return;
        }
        else{
          var assign = (user&&user.name)?user.name:'';
          if(user&&user.lastname){
            assign = assign +" "+user.lastname;
          }
          assigns[i] = assign;
          i++;
          if(i<tasks.length){
            func();
          }
          else{
            addTasksToDocx(docx,tasks,assigns,discussionId,tasksNum).then(
              function(result){
                if(result=='success'){
                  fulfill('success');
                }
                else{
                  logger.log('error', 'addTasks, %s', ' addTasksToDocx', {error: "Unknown Error"});
                  reject("error");
                }
              }
            ).catch(function(err){
              logger.log('error', 'addTasks, %s', ' addTasksToDocx', {error: err.message});
              reject(err);
            });
          }
        }
    });
  })();
  }

});

}

function addTasksToDocx(docx,tasks,assigns,discussionId,tasksNum){
  return new Promise(function (fulfill, reject){
    var pObj = docx.createP ({align: 'right' });
    var prefix = URL+"/tasks/by-discussion/"+discussionId+"/";
    pObj.addText (':משימות מהדיון' , {font_size: 14, font_face:'David',bold:true,underline:true});
    if(tasks==null || tasks==undefined || tasks.length==0){
      writeDocxToFile(docx,discussionId).then(function(result){
      if(result=='success'){
        fulfill('success');
      }
      else{
        logger.log('error', 'addTasksToDocx, %s', ' writeDocxToFile', {error: 'Unknown Error'});

        reject('error');
      }
      });

    }
    for(var i = 0 ; i < tasksNum ; i++){
      var pObj = docx.createP ({align: 'right' });
      var currentTask = tasks[i];
      var flag = (currentTask.title.charAt(0)>='א' && currentTask.title.charAt(0)<='ת');
      if(flag){
       // pObj.addText ((i+1)+". " , {font_size: 14, font_face:'David',bold:true});
        pObj.addText(currentTask.title , {font_size: 19, font_face:'David',bold:true,underline:true});
      }
      if(!flag){
        pObj.addText(currentTask.title , {font_size: 14, font_face:'David',bold:true,underline:true});
        pObj.addText (" ."+(i+1) , {font_size: 14, font_face:'David',bold:true});
      }
      if(currentTask.description){
      //description
      var desc = currentTask.description?currentTask.description.substring(3,currentTask.description.length-4):'';
      var pObj = docx.createP ({align: 'right' });
      var flag = (desc.charAt(0)>='א' && desc.charAt(0)<='ת');
      if(flag){
        pObj.addText ("פירוט:" , {font_size: 14, font_face:'David',bold:true,underline:true});
        pObj.addText(desc,{font_size: 14, font_face:'David'});
      }
      if(!flag){
        pObj.addText(desc,{font_size: 14, font_face:'David'});
        pObj.addText (":פירוט", {font_size: 14, font_face:'David',bold:true,underline:true});
      }
    }
    if(currentTask.watchers&&currentTask.watchers.length>0){

      //participants
      var pObj = docx.createP ({align: 'right' });
      pObj.addText (':');
      pObj.addText ( 'משתתפים', {font_size: 14, font_face:'David',bold:true,underline:true});
      pObj.addLineBreak();
      for(var j = 0 ; j < currentTask.watchers.length ; j++){
        //var watcher = assigns[i+tasksNum+j];
        var watcher = currentTask.watchers[j].name;
        pObj.addText (watcher);
        if(j != currentTask.watchers.length-1){
          pObj.addText (" , ");
        }
      }
    }

      //URL
      var pObj = docx.createP ({align: 'right' });
      var address = prefix+tasks[i]._id+"/activities";
      pObj.addText (":כתובת המשימה" , {font_size: 14, font_face:'David',bold:true,underline:true});
      pObj.addLineBreak();
      pObj.addText(address , {font_face:'David',font_size: 10, underline:true});

      //assign
      pObj.addLineBreak();

      if(currentTask.assign){

      var assign = currentTask.assign.name;
      var flag = (assign.charAt(0)>='א' && assign.charAt(0)<='ת');

      var pObj = docx.createP ({align: 'left' });
      if(flag){
        pObj.addText ("אחראי:" , {font_size: 14, font_face:'David',bold:true,underline:true});
        pObj.addText(assign,{font_size: 14, font_face:'David'});
      }
      if(!flag){
        pObj.addText(assign,{font_size: 14, font_face:'David'});
        pObj.addText (":אחראי", {font_size: 14, font_face:'David',bold:true,underline:true});
      }
    }

      //due
      if(currentTask.due){

      var pObj = docx.createP ({align: 'left' });
      var due = currentTask.due?currentTask.due:null;
      var due = due!=null? new Date(due) : null;
      var dateString = due!=null? due.getDate()+"/"+(due.getMonth()+1)+"/"+due.getFullYear() :'';
      var timeString = due!=null? (due.getHours().toString().length==1?"0"+
      due.getMinutes().toString():due.getMinutes().toString())+":"+(due.getMinutes().toString().length==1?"0"+due.getMinutes().toString():due.getMinutes().toString()):''; 
      pObj.addText ("תג״ב: " , {font_size: 14, font_face:'David',bold:true,underline:true});
      pObj.addText(dateString,{font_size: 14, font_face:'David'});
      }
    }
    writeDocxToFile(docx,discussionId).then(function(result){
    if(result=='success'){
      fulfill('success');
    }
    else{
      logger.log('error', 'addTasksToDocx, %s', ' writeDocxToFile', {error: 'Unknown Error'});

      reject('error');
    }
    }).catch(function(err){
      logger.log('error', 'addTasksToDocx, %s', ' writeDocxToFile', {error: err.message});
      reject(err);

    });
  });
}

function createPDF(discussion , tasks){
  return new Promise(function (fulfill, reject){
    var docx = officegen('docx');
    docx.on ( 'finalize', function ( written ) {
    });
    docx.on ( 'error', function ( err ) {
      logger.log('error', 'createPDF, %s', ' docx (officegen)', {error: err.message});
    });

    //Today's date
    var date = new Date();
    var dateString = date.getDate()+"/"+(date.getMonth()+1)+"/"+date.getFullYear();
    var header = docx.getHeader ().createP ({align: 'left' });
    header.addText (dateString+" ",{font_size: 14, font_face:'David'});
    header.addText (':',{font_size: 14, font_face:'David'});
    header.addText ('תאריך' , {font_size: 14, font_face:'David',bold:true,underline:true});
    var header = docx.getHeader ().createP ({align: 'center' });
   if(discussion.title){
    //Discussion title
    var flag = (discussion.title.charAt(0)>='א' && discussion.title.charAt(0)<='ת');
    if(flag){
      header.addText ("דיון:" , {font_size: 14, font_face:'David',bold:true,underline:true});
      header.addText(discussion.title , {font_size: 14, font_face:'David',underline:true});
    }
    if(!flag){
      header.addText(discussion.title , {font_size: 14, font_face:'David',underline:true});
      header.addText (":דיון" , {font_size: 14, font_face:'David',bold:true,underline:true});
    }
  }

  if(discussion.assign){
    //assign
    var pObj = docx.createP ({align: 'right' });
    var flag = (discussion.assign.name.charAt(0)>='א' && discussion.assign.name.charAt(0)<='ת');

    if(flag){
      pObj.addText ("אחראי הדיון:" , {font_size: 14, font_face:'David',bold:true,underline:true});
      pObj.addText(discussion.assign.name,{font_size: 14, font_face:'David'});
    }
    if(!flag){
      if(discussion.assign.lastname){
        pObj.addText (discussion.assign.lastname+" ",{font_size: 14, font_face:'David'});
      }
      pObj.addText(discussion.assign.name,{font_size: 14, font_face:'David'});
      pObj.addText (":אחראי הדיון" , {font_size: 14, font_face:'David',bold:true,underline:true});
    }
  }

if(discussion.watchers&&discussion.watchers.length>0){
    //participants
    var pObj = docx.createP ({align: 'right' });
    pObj.addText (':',{font_size: 14, font_face:'David'});
    pObj.addText ( 'בדיון נכחו', {font_size: 14, font_face:'David',bold:true,underline:true});
    pObj.addLineBreak();
    for(var i = 0 ; i < discussion.watchers.length ; i++){
      if(discussion.watchers[i].lastname){
        pObj.addText (discussion.watchers[i].lastname+" ",{font_size: 14, font_face:'David'});
      }
      pObj.addText (discussion.watchers[i].name,{font_size: 14, font_face:'David'});
      if(i != discussion.watchers.length-1){
        pObj.addText (" , ",{font_size: 14, font_face:'David'});
      }
    }
  }

    //starting time
    var date = new Date(discussion.startTime);
    var hours = date.getHours().toString();
    var minutes = date.getMinutes().toString();
    hours = hours.length==1?"0"+hours:hours;
    minutes = minutes.length==1?"0"+minutes:minutes;
    var dateString = date.getDate()+"/"+(date.getMonth()+1)+"/"+date.getFullYear();
    var timeString = hours+":"+minutes;
    var pObj = docx.createP ({align: 'right' });


    if (!discussion.allDay && discussion.hasStartTime){
      pObj.addText(timeString,{font_size: 14, font_face:'David'});
    }
    pObj.addText ("מועד התחלה: " , {font_size: 14, font_face:'David',bold:true,underline:true});
    pObj.addText(dateString,{font_size: 14, font_face:'David'});

    if(!discussion.allDay && discussion.hasStartTime){
    pObj.addText (" בשעה ",{font_size: 14, font_face:'David'});
  }
   if(discussion.allDay){
      pObj.addText(' כל היום',{font_size: 14, font_face:'David'});
    }

    if(!discussion.allDay){
    //ending time
    var date = new Date(discussion.endTime);
    var hours = date.getHours().toString();
    var minutes = date.getMinutes().toString();
    hours = hours.length==1?"0"+hours:hours;
    minutes = minutes.length==1?"0"+minutes:minutes;
    var dateString = date.getDate()+"/"+(date.getMonth()+1)+"/"+date.getFullYear();
    var timeString = hours+":"+minutes;
    var pObj = docx.createP ({align: 'right' });
    if(discussion.hasEndTime){
      pObj.addText(timeString,{font_size: 14, font_face:'David'});
    }
    pObj.addText ("מועד סיום: " , {font_size: 14, font_face:'David',bold:true,underline:true});
    pObj.addText(dateString,{font_size: 14, font_face:'David'});
    if(discussion.hasEndTime){
      pObj.addText (" בשעה ",{font_size: 14, font_face:'David'});
  }
  }

  if(discussion.location){

  //location
    var pObj = docx.createP ({align: 'right' });
    var flag = (discussion.location.charAt(0)>='א' && discussion.location.charAt(0)<='ת');
    if(flag){
      pObj.addText ("מיקום:" , {font_size: 14, font_face:'David',bold:true,underline:true});
      pObj.addText(discussion.location,{font_size: 14, font_face:'David'});
    }
    if(!flag){
      pObj.addText(discussion.location,{font_size: 14, font_face:'David'});
      pObj.addText (":מיקום" , {font_size: 14, font_face:'David',bold:true,underline:true});
    }
  }

    //url
    var pObj = docx.createP ({align: 'right' });
    
    pObj.addText (":כתובת הדיון" , {font_size: 14, font_face:'David',bold:true,underline:true});
    pObj.addLineBreak();
    var url = URL+"/discussions/all/"+discussion._id;
    pObj.addText(url,{font_size: 10, font_face:'David',underline:true});
    var pObj = docx.createP ();
    pObj.addLineBreak();
    //tasks
    var tasks2 = [];
    for(var i = 0;i<tasks.length;i++){
      tasks2.push(tasks[i]);
    }

    for(var i = 0;i<tasks.length;i++){
      for(var j=0;j<tasks[i].watchers.length;j++){
        tasks2.push({'assign' : tasks[i].watchers[j]});
      }
    }
    addTasks(docx,tasks2,discussion._id,tasks.length).then(function(result){
      if(result=='success'){
        fulfill('success');
      }
      else{
        logger.log('error', 'createPDF, %s', ' addTasks', {error: "Unknown Error"});
        reject('error');
      }
    }).catch(function(err){
      logger.log('error', 'createPDF, %s', ' addTasks', {error: err.message});
        reject(err);
    });

});
}

exports.send = function(type, data) {
  if (type === 'comment_email') {
    return;
  }
  var rootPath='';


  var port = config.https && config.https.port ? config.https.port : config.http.port;
  data.uriRoot = config.host + ':' + port;
  data.date = new Date();
  var recipients = data.discussion.watchers;

  var assignId = data.discussion.assign._id;
  var flag = false;
  for(var i=0;i<recipients.length;i++){
    if(assignId == recipients[i]._id){
      flag = true;
    }
  }
  if(!flag){
    recipients.push(data.discussion.assign);
  }

  var unique = [];
  var json ={};
  for(var i=0;i<recipients.length;i++){
    json[recipients[i]._id]=recipients[i];
  }
  for(var key in json){
    unique.push(json[key]);
  }
  recipients = unique;
  data.discussion.watchers=recipients;


  var discussionStatus = data.discussion.status;
  var attendingPeople=[];
  data.attendees = [];
  var ids = [], emails = [];
  for (var i = 0; i < recipients.length; i++) {
    if (ids.indexOf(recipients[i]._id.toString()) === -1) {
      var json = {
        "name": recipients[i].name,
        "email": recipients[i].email
      };
      attendingPeople.push(json);
      ids.push(recipients[i]._id.toString());
      emails.push(recipients[i].email);
      data.attendees.push(recipients[i].name);
    }
  }
  var status = data.discussion.status;
  var calMethod = status=="canceled"?"CANCEL":"REQUEST";

  var path = "files/notes/"+data.discussion._id+".pdf";

  var allDay;
  if(!data.discussion.allDay){
    allDay = false;
  }
  else{
    allDay=true;
  }

  var startTime = new Date(data.discussion.startDate);
  if(data.discussion.startTime){
    startTime.setHours(data.discussion.startTime.getHours());
    startTime.setMinutes(data.discussion.startTime.getMinutes());
    data.discussion.hasStartTime = true;
  }
  else{
    data.discussion.hasStartTime = false;
  }
  data.discussion.startTime = startTime;

  if(!data.discussion.allDay && data.discussion.endDate){
    var endTime = new Date(data.discussion.endDate);
    if(data.discussion.endTime){
      endTime.setHours(data.discussion.endTime.getHours());
      endTime.setMinutes(data.discussion.endTime.getMinutes());
      data.discussion.hasEndTime = true;
      data.discussion.endTime = endTime;
    }
    else{
      endTime = startTime;
      data.discussion.hasEndTime = false;
      data.discussion.endTime = startTime;
    }
  }
  else{
    data.discussion.hasEndTime = false;
    data.discussion.endTime = startTime;
  }

  var builder = icalToolkit.createIcsFileBuilder();
  builder.spaces = true;
  builder.NEWLINE_CHAR = '\r\n';
  builder.throwError = false;
  builder.ignoreTZIDMismatch = true;
  builder.calname = data.discussion.title;
  builder.timezone = 'asia/istanbul';
  builder.tzid = 'asia/istanbul';
  builder.method = calMethod;
  builder.events.push({
    start : data.discussion.startTime ,
    end : data.discussion.endTime,
    transp : 'OPAQUE',
    summary : "ICU Event",
    additionalTags : {
      "Tag" : data.discussion.title
    },
    uid : null,
    sequence : null,
    allDay : allDay,
    stamp : new Date(),
    floating : false,
    location : data.discussion.location,
    description : "ICU EVENT",
    organizer : {
      name : "ICU",
      email : 'admin@linnovate.net'
    },
    attendees : attendingPeople,
    mathod : 'PUBLISH',
    status : 'CONFIRMED'
  });
  var content = builder.toString();
  var buffer = new Buffer(content);

  data.attendees.join(', ');
  exec("pwd | tr -d '\n'", function(error, stdout, stderr) { 
    if(error){
      logger.log('error', 'send, %s', ' pwd', {error: error.message});
    }
    

    rootPath = stdout;
    if(data.projects){
      data.projects.forEach(function(p){
        if(p.tasks && p.tasks.length>0){
          data.additionalTasks.push(p.tasks[0]);
        }
      });
    }
    createPDF(data.discussion , data.additionalTasks).then(function(result){
      render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var p = rootPath+'/files/notes/'+data.discussion._id+".pdf";
      var mailOptions = {
        "to" : recipient,
        "from" : config.emailFrom,
        "subject" : data.discussion.title,
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };
      if(status == "new"){
        mailOptions['alternatives'] =  [{
          contentType: "text/calendar",
          content: buffer}];
     }
     if(status == "scheduled"){
        mailOptions['attachments'] =  [{
          filename: data.discussion.title+'.pdf',
            path: p,
            contentType: 'application/pdf'
          }];
     }

      return send(mailOptions);
    });

    return Q.all(promises);
  });
  }).catch(function(err){
    logger.log('error', 'send, %s', ' createPDF', {error: err.message});

  });
  }); //Creating the PDF file, and receiving its path


  return render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var mailOptions = {
        "to" : 'test@test.test',
        "from" : config.emailFrom,
        "subject" : data.discussion.title,
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };
      if(status == "new"){
        mailOptions['alternatives'] =  [{
          contentType: "text/calendar",
          content: buffer}];

        mailOptions['attachments'] =  [{
          filename: data.discussion._id+'.pdf',
            path: rootPath+ '/files/notes/'+data.discussion._id+".pdf",
            contentType: 'application/pdf'
          }];
      }

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', ' send, %s', ' render', {error: 'Unknown Error'});

  });
};

exports.sendMyTasksOfTodaySummary = function(type, data) {
  if (type === 'comment_email') {
    return;
  }
  var rootPath='';

  var port = config.https && config.https.port ? config.https.port : config.http.port;
  data.uriRoot = config.host + ':' + port;
  data.date = new Date();
  
  var recipients = [];
  recipients[0] = data.user;

  var unique = [];
  var json ={};
  for(var i=0;i<recipients.length;i++){
    json[recipients[i]._id]=recipients[i];
  }
  for(var key in json){
    unique.push(json[key]);
  }
  recipients = unique;

  var attendingPeople=[];
  data.attendees = [];
   var ids = [], emails = [];
  for (var i = 0; i < recipients.length; i++) {
    if (ids.indexOf(recipients[i]._id.toString()) === -1) {
      var json = {
        "name": recipients[i].name,
        "email": recipients[i].email
      };
      attendingPeople.push(json);
      ids.push(recipients[i]._id.toString());
       emails.push(recipients[i].email);
      data.attendees.push(recipients[i].name);
    }
  }
  var calMethod = "REQUEST";

  var builder = icalToolkit.createIcsFileBuilder();
  builder.spaces = true;
  builder.NEWLINE_CHAR = '\r\n';
  builder.throwError = false;
  builder.ignoreTZIDMismatch = true;
  builder.calname = "This My Today tasks";
  builder.timezone = 'asia/istanbul';
  builder.tzid = 'asia/istanbul';
  builder.method = calMethod;

  var content = builder.toString();
  var buffer = new Buffer(content);

  exec("pwd | tr -d '\n'", function(error, stdout, stderr) {
    if(error){
      logger.log('error', 'sendMyTasksOfTodaySummary, %s', ' pwd', {error: error.message});

    } 
    rootPath = stdout;
      render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var mailOptions = {
        "to" : recipient,
        "from" : config.emailFrom,
        "subject" : "This My Today tasks",
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', 'sendMyTasksOfTodaySummary, %s', ' render', {error: "Unknown Error"});

  });
  });


  return render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var mailOptions = {
        "to" : 'test@test.test',
        "from" : config.emailFrom,
        "subject" : "This My Today tasks",
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', 'sendMyTasksOfTodaySummary, %s', ' render', {error: "Unknown Error"});

  });
};


exports.sendMyTasksOfNextWeekSummary = function(type, data) {
  if (type === 'comment_email') {
    return;
  }
  var rootPath='';

  var port = config.https && config.https.port ? config.https.port : config.http.port;
  data.uriRoot = config.host + ':' + port;
  data.date = new Date();
  
  var recipients = [];
  recipients[0] = data.user;

  var unique = [];
  var json ={};
  for(var i=0;i<recipients.length;i++){
    json[recipients[i]._id]=recipients[i];
  }
  for(var key in json){
    unique.push(json[key]);
  }
  recipients = unique;

  var attendingPeople=[];
  data.attendees = [];
   var ids = [], emails = [];
  for (var i = 0; i < recipients.length; i++) {
    if (ids.indexOf(recipients[i]._id.toString()) === -1) {
      var json = {
        "name": recipients[i].name,
        "email": recipients[i].email
      };
      attendingPeople.push(json);
      ids.push(recipients[i]._id.toString());
       emails.push(recipients[i].email);
      data.attendees.push(recipients[i].name);
    }
  }
  var calMethod = "REQUEST";

  var builder = icalToolkit.createIcsFileBuilder();
  builder.spaces = true;
  builder.NEWLINE_CHAR = '\r\n';
  builder.throwError = false;
  builder.ignoreTZIDMismatch = true;
  builder.calname = "This My Week tasks";
  builder.timezone = 'asia/istanbul';
  builder.tzid = 'asia/istanbul';
  builder.method = calMethod;

  var content = builder.toString();
  var buffer = new Buffer(content);

  exec("pwd | tr -d '\n'", function(error, stdout, stderr) { 
    if(error){
      logger.log('error', 'sendMyTasksOfNextWeekSummary, %s', ' pwd', {error: error.message});

    }
    rootPath = stdout;
      render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var mailOptions = {
        "to" : recipient,
        "from" : config.emailFrom,
        "subject" : "This My Week tasks",
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', 'sendMyTasksOfNextWeekSummary, %s', ' render', {error: err.message});

  });
  });


  return render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var mailOptions = {
        "to" : 'test@test.test',
        "from" : config.emailFrom,
        "subject" : "This My Week tasks",
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', 'sendMyTasksOfNextWeekSummary, %s', ' render', {error: err.message});

  });
};

exports.sendGivenTasksOfNextWeekSummary = function(type, data) {
  if (type === 'comment_email') {
    return;
  }
  var rootPath='';

  var port = config.https && config.https.port ? config.https.port : config.http.port;
  data.uriRoot = config.host + ':' + port;
  data.date = new Date();
  
  var recipients = [];
  recipients[0] = data.user;

  var unique = [];
  var json ={};
  for(var i=0;i<recipients.length;i++){
    json[recipients[i]._id]=recipients[i];
  }
  for(var key in json){
    unique.push(json[key]);
  }
  recipients = unique;
  var attendingPeople=[];
  data.attendees = [];
   var ids = [], emails = [];
  for (var i = 0; i < recipients.length; i++) {
    if (ids.indexOf(recipients[i]._id.toString()) === -1) {
      var json = {
        "name": recipients[i].name,
        "email": recipients[i].email
      };
      attendingPeople.push(json);
      ids.push(recipients[i]._id.toString());
       emails.push(recipients[i].email);
      data.attendees.push(recipients[i].name);
    }
  }
  var calMethod = "REQUEST";

  var builder = icalToolkit.createIcsFileBuilder();
  builder.spaces = true;
  builder.NEWLINE_CHAR = '\r\n';
  builder.throwError = false;
  builder.ignoreTZIDMismatch = true;
  builder.calname = "This Week Given tasks";
  builder.timezone = 'asia/istanbul';
  builder.tzid = 'asia/istanbul';
  builder.method = calMethod;

  var content = builder.toString();
  var buffer = new Buffer(content);

  exec("pwd | tr -d '\n'", function(error, stdout, stderr) { 
    if(error){
      logger.log('error', 'sendGivenTasksOfNextWeekSummary, %s', ' render', {error: error.message});

    }
    rootPath = stdout;
      render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var mailOptions = {
        "to" : recipient,
        "from" : config.emailFrom,
        "subject" : "This Week Given tasks",
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', 'sendGivenTasksOfNextWeekSummary, %s', ' render', {error: err.message});

  });;
  });


  return render(type, data).then(function(results) {
    var promises = emails.map(function(recipient) {
      var mailOptions = {
        "to" : 'test@test.test',
        "from" : config.emailFrom,
        "subject" : "This Week Given tasks",
        "html" : results.html,
        "text" : results.text,
        "forceEmbeddedImages" : true
      };

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', 'sendGivenTasksOfNextWeekSummary, %s', ' render', {error: err.message});

  });
};

exports.system = function(data) {
  var port = config.https && config.https.port ? config.https.port : config.http.port;
  data.uriRoot = config.host + ':' + port;
  data.date = new Date();
  var recipients = config.system.recipients;
  var r = [];
  for (var i in recipients) {
    r.push(recipients[i]);
  }

  return render('system', data).then(function(results) {
    var promises = r.map(function(recipient) {
      var mailOptions = {
        to: recipient,
        from: config.emailFrom,
        subject: 'Root System',
        html: results.html,
        text: results.text,
        forceEmbeddedImages: true
      };

      return send(mailOptions);
    });

    return Q.all(promises);
  }).catch(function(err){
    logger.log('error', 'system, %s', ' render', {error: err.message});

  });;
};
