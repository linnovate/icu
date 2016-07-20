'use strict';

angular.module('mean.icu.ui.taskdetails', [])
.controller('TaskDetailsController', function ($scope,
                                               entity,
                                               tags,
                                               projects,
                                               $state,
                                               TasksService,
                                               context,
                                               $stateParams,
                                               $rootScope,
                                               MeanSocket,
                                               UsersService) {
    $scope.task = entity || context.entity;
    $scope.tags = tags;
    $scope.projects = projects.data || projects;
    $scope.shouldAutofocus = !$stateParams.nameFocused;

    TasksService.getStarred().then(function(starred) {
        $scope.task.star = _(starred).any(function(s) {
            return s._id === $scope.task._id;
        });
    });

    if (!$scope.task) {
        $state.go('main.tasks.byentity', {
            entity: context.entityName,
            entityId: context.entityId
        });
    }

    $scope.tagInputVisible = false;

    $scope.statuses = ['new', 'assigned', 'in-progress', 'review', 'rejected', 'done'];
    $rootScope.$broadcast('updateNotification', { taskId: $stateParams.id });

    $scope.getUnusedTags = function () {
        return _.chain($scope.tags).reject(function (t) {
            return $scope.task.tags.indexOf(t.term) >= 0;
        }).sortBy(function (a, b) {
            return b.count - a.count;
        }).pluck('term').value();
    };

    $scope.$watchGroup(['task.description'], function (nVal, oVal) {
        if (nVal !== oVal && oVal) {
            $scope.delayedUpdate($scope.task);
        }
    });

    $scope.addTag = function (tag) {
        $scope.task.tags.push(tag);
        $scope.update($scope.task);
        $scope.tagInputVisible = false;
    };

    $scope.removeTag = function (tag) {
        $scope.task.tags = _($scope.task.tags).without(tag);
        $scope.update($scope.task);
    };

    $scope.options = {
        theme: 'bootstrap',
        buttons: ['bold', 'italic', 'underline', 'anchor', 'quote', 'orderedlist', 'unorderedlist']
    };

    $scope.dueOptions = {
        onSelect: function () {
            $scope.update($scope.task);
        },
        dateFormat: 'd.m.yy'
    };

    function navigateToDetails(task) {
        $scope.detailsState = context.entityName === 'all' ? 'main.tasks.all.details' : 'main.tasks.byentity.details';

        $state.reload('main.tasks');
    }

    $scope.star = function (task) {
        TasksService.star(task).then(function () {
            navigateToDetails(task);
        });
    };

    $scope.unsetProject = function (event, task) {
        event.stopPropagation();
        delete task.project;
        $scope.update(task);
    };

    $scope.deleteTask = function (task) {
        TasksService.remove(task._id).then(function () {
            var state = context.entityName === 'all' ?
                'main.tasks.all' : 'main.tasks.byentity';

            $state.go(state, {
                entity: context.entityName,
                entityId: context.entityId
            }, {reload: true});
        });
    };
    
    //Made By OHAD
    $scope.updateAndNotiy = function (task) {
        if (context.entityName === 'discussion') {
            task.discussion = context.entityId;
        }
        
        UsersService.getMe().then(function (me) {
            
            var message = {};
            message.content = task.title;
            //"message":{"content":"tyui"}
            MeanSocket.emit('message:send', {
                message: message,
                user: me.name,
                channel: task.assign,
                id: task.id
            });

            TasksService.update(task).then(function (result) {
                if (context.entityName === 'project') {
                    var projId = result.project ? result.project._id : undefined;
                    if (projId !== context.entityId) {
                        $state.go('main.tasks.byentity', {
                            entity: context.entityName,
                            entityId: context.entityId
                        }, {reload: true});
                    }
                }
            });
        
        });
    };
    //END Made By OHAD

    $scope.update = function (task) {
        if (context.entityName === 'discussion') {
            task.discussion = context.entityId;
        }

        TasksService.update(task).then(function (result) {
            if (context.entityName === 'project') {
                var projId = result.project ? result.project._id : undefined;
                if (projId !== context.entityId) {
                    $state.go('main.tasks.byentity', {
                        entity: context.entityName,
                        entityId: context.entityId
                    }, {reload: true});
                }
            }
        });
    };

    $scope.delayedUpdate = _.debounce($scope.update, 500);

    if ($scope.task &&
            ($state.current.name === 'main.tasks.byentity.details' ||
            $state.current.name === 'main.search.task' ||
            $state.current.name === 'main.tasks.all.details')) {
        $state.go('.activities');
    }
});
