'use strict';

angular.module('mean.icu.ui.tasklist', [])
.directive('icuTaskList', function () {
    function controller($scope, context, TasksService, $state) {
        $scope.context = context;

        $scope.newTask = TasksService.getNew(context.entityId);

        $scope.update = _.debounce(function(task) {
            TasksService.update(task);
        }, 300);

        var creatingStatuses = {
            NotCreated: 0,
            Creating: 1,
            Created: 2
        };

        var created = creatingStatuses.NotCreated;

        $scope.createOrUpdate = function(task) {
            console.log(created);
            if (created === creatingStatuses.NotCreated) {
                created = creatingStatuses.Creating;
                console.log('fired');
                TasksService.create(task).then(function(result) {
                    created = creatingStatuses.Created;
                    task._id = result._id;
                });
            } else if (created === creatingStatuses.Created) {
                TasksService.update(task);
            }
        };
    }

    return {
        restrict: 'A',
        templateUrl: '/icu/components/task-list/task-list.directive.template.html',
        scope: {
            tasks: '=',
            drawArrow: '=',
            groupTasks: '='
        },
        controller: controller
    };
});
