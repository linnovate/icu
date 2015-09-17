'use strict';

angular.module('mean.icu.ui.taskdetails', [])
.controller('TaskDetailsController', function ($scope, entity, tags, projects, $state, TasksService, context) {
    $scope.task = entity || context.entity;
    $scope.tags = tags;
    $scope.projects = projects;

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

    $scope.statuses = ['New', 'Assigned', 'In progress', 'Review', 'Rejected', 'Done'];

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

    $scope.star = function (task) {
        TasksService.star(task).then(function () {
            $state.reload('main.tasks.byentity.details');
        });
    };

    $scope.deleteProject = function (event, task) {
        event.stopPropagation();
        delete task.project;
        $scope.update(task);
    };

    $scope.deleteTask = function (task) {
        TasksService.remove(task._id).then(function () {
            $state.go('main.tasks.byentity', {
                entity: context.entityName === 'all' ? 'task' : context.entityName,
                entityId: context.entityId
            }, {reload: true});
        });
    };

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
