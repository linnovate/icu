'use strict';

var options = {
  includes: 'watchers assign creator',
  defaults: {
    watchers: [],
    assign: undefined
  }
};

exports.defaultOptions = options;

var crud = require('../controllers/crud.js');
var discussionController = crud('discussions', options);

var utils = require('./utils'),
  mongoose = require('mongoose'),
  Task = require('../models/task.js'),
  Discussion = mongoose.model('Discussion'),
  TaskArchive = mongoose.model('task_archive'),
  User = require('../models/user.js'),
  _ = require('lodash'),
  mailService = require('../services/mail'),
  elasticsearch = require('./elasticsearch.js');

Object.keys(discussionController).forEach(function(methodName) {
  if (methodName !== 'destroy') {
    exports[methodName] = discussionController[methodName];
  }
});

exports.destroy = function(req, res, next) {
  if (req.locals.error) {
    return next();
  }

  var discussion = req.locals.result;

  Task.find({
    discussions: req.params.id,
    currentUser: req.user
  }).then(function(tasks) {
    //FIXME: do it with mongo aggregate
    var groupedTasks = _.groupBy(tasks, function(task) {
      return task.project || task.discussions.length > 1 ? 'release' : 'remove';
    });

    groupedTasks.remove = groupedTasks.remove || [];
    groupedTasks.release = groupedTasks.release || [];

    Task.update({
      _id: {
        $in: groupedTasks.release
      }
    }, {
      $pull: {
        discussions: discussion._id
      }
    }).exec();

    Task.remove({
      _id: {
        $in: groupedTasks.remove
      }
    }).then(function() {

      //FIXME: needs to be optimized to one query
      groupedTasks.remove.forEach(function(task) {
        elasticsearch.delete(task, 'task', null, next);
      });

      var removeTaskIds = _(groupedTasks.remove)
        .pluck('_id')
        .map(function(i) {
          return i.toString();
        })
        .value();

      User.update({
        'profile.starredTasks': {
          $in: removeTaskIds
        }
      }, {
        $pull: {
          'profile.starredTasks': {
            $in: removeTaskIds
          }
        }
      }).exec();
    });

    discussionController.destroy(req, res, next);
  });
};

exports.schedule = function(req, res, next) {
  if (req.locals.error) {
    console.log("1");
    next();
  }

  var discussion = req.locals.result;
  console.log("====================req.locals=====================");
  console.log(JSON.stringify(req.locals));

  if (!discussion.due) {
    console.log("2");
    console.log(discussion);
    console.log("====================discussion.due=====================");
    console.log(discussion.due);
    req.locals.error = {
      message: 'Due field cannot be empty'
    };
    return next();
  }

  if (!discussion.assign) {
    console.log("3");
    req.locals.error = {
      message: 'Assignee cannot be empty'
    };
    return next();
  }

  var allowedStatuses = ['new', 'scheduled', 'cancelled'];
  if (allowedStatuses.indexOf(discussion.status) === -1) {
    console.log("4");
    req.locals.error = {
      message: 'Cannot be scheduled for this status'
    };
    return next();
  }

  console.log("discussion");
  console.log(discussion);

  Task.find({
    discussions: discussion._id,
    currentUser: req.user
  }).then(function(tasks) {
    console.log("tasks");
    console.log(tasks);
    var groupedTasks = _.groupBy(tasks, function(task) {
      return _.contains(task.tags, 'Agenda');
    });

    mailService.send('discussionSchedule', {
      discussion: discussion,
      agendaTasks: groupedTasks['true'] || [],
      additionalTasks: groupedTasks['false'] || []
    }).then(function() {
      console.log("req.locals.data.body");
      console.log(req.locals.data.body);
      req.locals.data.body = discussion;
      req.locals.data.body.status = 'scheduled';
      next();
    });
  });
};

exports.summary = function(req, res, next) {
  if (req.locals.error) {
    next();
  }

  var discussion = req.locals.result;

  var allowedStatuses = ['scheduled'];
  if (allowedStatuses.indexOf(discussion.status) === -1) {
    utils.checkAndHandleError(true, 'Cannot send summary for this status', next);
    req.locals.error = {
      message: 'Cannot send summary for this status'
    };
    return next();
  }

  Task.find({
    discussions: discussion._id,
    currentUser: req.user
  }).populate('discussions')
    .then(function(tasks) {
      var projects = _.chain(tasks).pluck('project').compact().value();
      _.each(projects, function(project) {
        project.tasks = _.select(tasks, function(task) {
          return task.project === project;
        });
      });

      var additionalTasks = _.select(tasks, function(task) {
        return !task.project;
      });

      mailService.send('discussionSummary', {
        discussion: discussion,
        projects: projects,
        additionalTasks: additionalTasks
      }).then(function() {
        var taskIds = _.reduce(tasks, function(memo, task) {
          var containsAgenda = !_.any(task.discussions, function(d) {
            return d.id !== discussion.id && (d.status === 'new' || d.status === 'scheduled');
          });

          var shouldRemoveTag = task.tags.indexOf('Agenda') !== -1 && containsAgenda;

          if (shouldRemoveTag) {
            memo.push(task._id);
          }

          return memo;
        }, []);

        Task.update({
          _id: {
            $in: taskIds
          }
        }, {
          $pull: {
            tags: 'Agenda'
          }
        }, {
          multi: true
        }).exec();

        req.locals.data.body = discussion;
        req.locals.data.body.status = 'done';
        next();
      });
    });
};

exports.getByEntity = function(req, res, next) {
  if (req.locals.error) {
    return next();
  }

  var entities = {
    users: 'creator',
    _id: '_id',
    projects: 'project'
  },
    entityQuery = {};

  entityQuery[entities[req.params.entity]] = req.params.id;
  var starredOnly = false;
  var ids = req.locals.data.ids;
  if (ids && ids.length) {
    entityQuery._id = {
      $in: ids
    };
    starredOnly = true;
  }
  var query = req.acl.query('Discussion');
 
  query.find(entityQuery);

  query.populate(options.includes);

  Discussion.find(entityQuery).count({}, function(err, c) {
    req.locals.data.pagination.count = c;

    var pagination = req.locals.data.pagination;
    if (pagination && pagination.type && pagination.type === 'page') {
      query.sort(pagination.sort)
        .skip(pagination.start)
        .limit(pagination.limit);
    }

    query.exec(function(err, discussions) {
      if (err) {
        req.locals.error = {
          message: 'Can\'t get discussions'
        };
      } else {
        if (starredOnly) {
          discussions.forEach(function(discussion) {
            discussion.star = true;
          });
        }

        req.locals.result = discussions;
      }

      next();
    });

  });
};

exports.getByProject = function(req, res, next) {
  var entities = {
    projects: 'project'
  },
    entityQuery = {
      discussions: {
        $not: {
          $size: 0
        }
      }
    };

  var starredOnly = false;
  var ids = req.locals.data.ids;
  if (ids && ids.length) {
    entityQuery._id = {
      $in: ids
    };
    starredOnly = true;
  }

  entityQuery[entities[req.params.entity]] = req.params.id;
  var Query = Task.find(entityQuery, {
    discussions: 1,
    _id: 0
  });
  Query.populate('discussions');

  var pagination = req.locals.data.pagination;
  if (pagination && pagination.type && pagination.type === 'page') {
    Query.sort(pagination.sort)
      .skip(pagination.start)
      .limit(pagination.limit);
  }

  Query.exec(function(err, discussions) {
    if (err) {
      req.locals.error = {
        message: 'Can\'t get projects'
      };
    } else {
      //remove duplicates
      discussions = _.reduce(discussions, function(flattened, other) {
        return flattened.concat(other.discussions);
      }, []);

      discussions = _.uniq(discussions, '_id');

      if (starredOnly) {
        discussions.forEach(function(discussion) {
          discussion.star = true;
        });
      }

      req.locals.result = discussions;

      next();
    }
  });
};