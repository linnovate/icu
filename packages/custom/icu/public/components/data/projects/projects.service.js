'use strict';

angular.module('mean.icu.data.projectsservice', [])
  .service('ProjectsService', function(ApiUri, $http, $stateParams,
                                       BoldedService, NotifyingService, PaginationService, TasksService, $rootScope, WarningsService, ActivitiesService) {
    var EntityPrefix = '/projects';
    var data = [], selected;

    function getAll(start, limit, sort) {
        var qs = {
            start: start,
            sort: sort
        };
        let paramsId = $stateParams.id;
        qs.limit = findInExistingProjects(paramsId) ? limit : paramsId;
        qs = querystring.encode(qs);

        if (qs.length) {
            qs = '?' + qs;
        }
        return $http.get(ApiUri + EntityPrefix + qs).then(function(result) {
            WarningsService.setWarning(result.headers().warning);
            data = result.data.content || result.data;
            return result.data;
        }, function(err) {
            return err;
        }).then(function(some) {
            var data = some.content ? some : [];
            return PaginationService.processResponse(data);
        });
    }

      function findInExistingProjects(id){
          if(!id)return true;
          return !!data.find( taskInList => taskInList._id === id );
      }

    function getById(id) {
      return $http.get(ApiUri + EntityPrefix + '/' + id).then(function(result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    function removeFromParent(entity) {
      return new Promise(function(resolve) {
        if(entity.parent) {
          getById(entity.parent)
            .then(parent=>{
              var index = parent.subProjects.findIndex(sub=>{
                return sub._id === entity._id;
              });
              parent.subProjects.splice(index, 1);
              update(parent);
              return resolve();
            });
        }
        else {
          return resolve();
        }
      });
    }

    function addToParent(entity) {
      return new Promise(function(resolve) {
        if(entity.parent) {
          getById(entity.parent)
            .then(parent=>{
              parent.subProjects.push(entity);
              update(parent);
              return resolve();
            });
        }
        else {
          return resolve();
        }
      });
    }

    function getByEntityId(entity) {
      return function(id, start, limit, sort, starred) {
        var qs = querystring.encode({
          start: start,
          limit: limit,
          sort: sort
        });

        if(qs.length) {
          qs = '?' + qs;
        }

        var url = ApiUri + '/' + entity + '/' + id + EntityPrefix;
        if(starred) {
          url += '/starred';
        }

        return $http.get(url + qs).then(function(result) {
          WarningsService.setWarning(result.headers().warning);
          return PaginationService.processResponse(result.data);
        });
      };
    }

    function createActivity(updateField){
      return function(entity, me, prev){
        return ActivitiesService.create({
          data: {
            creator: me,
              date: new Date(),
              entity: entity.id,
              entityType: 'project',

            updateField: updateField,
            current: entity[updateField],
            prev: prev ? prev[updateField] : ''
          },
          context: {}
        });
      }
    }

    function getSubProjects(projectId) {
      return $http.get(ApiUri + EntityPrefix + '/subprojects/' + projectId).then(function(result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    function create(project) {
      return $http.post(ApiUri + EntityPrefix, project)
        .then(function(result) {
          WarningsService.setWarning(result.headers().warning);
          NotifyingService.notify('editionData');
          return result.data;
        });
    }


    function update(project, context) {
      context = context || {};
      if(!context.action) {
        context.action = 'updated';
      }
      if(!context.type) {
        context.type = 'project';
      }

      return $http.put(ApiUri + EntityPrefix + '/' + project._id, project)
        .then(function(result) {
          WarningsService.setWarning(result.headers().warning);
          if(project.subProjects
              && project.subProjects.length
              && project.subProjects[project.subProjects.length-1]
              && !project.subProjects[project.subProjects.length-1]._id) {
            var subProject = project.subProjects[project.subProjects.length-1];
          }
          if(TasksService.data) {
            TasksService.data.forEach(function(task) {
              if(task.project && task.project._id === project._id) {
                task.project = result.data;
              }
            });
          }
          if(TasksService.tabData) {
            TasksService.tabData.forEach(function(task) {
              if(task.project && task.project._id === project._id) {
                task.project = result.data;
              }
            });
          }
          if(result.data && result.data.subProjects)
            for(var i = 0; i < result.data.subProjects.length; i++) {
              if(result.data.subProjects[i].due) {
                result.data.subProjects[i].due = new Date(result.data.subProjects[i].due);
              }
            }
          if(subProject) result.data.subProjects.push(subProject);
          NotifyingService.notify('editionData');

          return result.data;
        })
        .then(entity => {
          let bolded = _.pick(BoldedService.boldedUpdate(entity, 'projects', 'update'), 'bolded');
          Object.assign(entity, bolded);

          return entity;
        });
    }

    function remove(id) {
      return $http.delete(ApiUri + EntityPrefix + '/' + id).then(function(result) {
        NotifyingService.notify('editionData');
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      }).then(entity => BoldedService.boldedUpdate(entity, 'projects', 'update'));
    }

    function star(project) {
      return $http.patch(ApiUri + EntityPrefix + '/' + project._id + '/star', {star: !project.star})
        .then(function (result) {
          WarningsService.setWarning(result.headers().warning);
          project.star = !project.star;
          return result.data;
        }).then(entity => BoldedService.boldedUpdate(entity, 'projects', 'update'));
    }

    function WantToCreateRoom(project) {
      return $http.post(ApiUri + EntityPrefix + '/' + project._id + '/WantToCreateRoom', project)
        .then(function(result) {
          WarningsService.setWarning(result.headers().warning);
          project.WantToCreateRoom = !project.WantToCreateRoom;
          return result.data;
        });
    }

    function getStarred() {
      return $http.get(ApiUri + EntityPrefix + '/starred').then(function(result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    function getSubProjects(projectId) {
      return $http.get(ApiUri + EntityPrefix + '/subprojects/' + projectId).then(function(result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    function getTemplate(projectId) {
      return $http.get(ApiUri + '/templates').then(function(result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    function saveTemplate(id, name) {
      return $http.post(ApiUri + EntityPrefix + '/' + id + '/toTemplate', name).then(function (result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      }).then(entity => BoldedService.boldedUpdate(entity, 'projects', 'update'));
    }

    function template2subProjects(templateId, data) {
      return $http.post(ApiUri  + '/templates/' + templateId + '/toSubProjects', data).then(function(result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    function deleteTemplate(id) {
      return $http.delete(ApiUri + '/templates/' + id).then(function(result) {
        NotifyingService.notify('editionData');
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    function getTags() {
      return $http.get(ApiUri + EntityPrefix + '/tags').then(function(result) {
        WarningsService.setWarning(result.headers().warning);
        return result.data;
      });
    }

    return {
      addToParent: addToParent,
      getAll: getAll,
      getById: getById,
      getByDiscussionId: getByEntityId('discussions'),
      getByUserId: getByEntityId('users'),
      getTags: getTags,
      getSubProjects: getSubProjects,
      getTemplate: getTemplate,
      saveTemplate: saveTemplate,
      template2subProjects: template2subProjects,
      deleteTemplate: deleteTemplate,
      create: create,
      update: update,
      remove: remove,
      removeFromParent: removeFromParent,
      star: star,
      getStarred: getStarred,
      data: data,
      selected: selected,
      WantToCreateRoom: WantToCreateRoom,
      assign: createActivity('assign'),
      updateDue: createActivity('due'),
      updateStar: createActivity('star'),
      updateTitle: createActivity('title'),
      updateDescription: createActivity('description'),
      updateStatus: createActivity('status'),
      updateTags: createActivity('tags'),
      updateWatcher: createActivity('watchers'),
    };
  });
