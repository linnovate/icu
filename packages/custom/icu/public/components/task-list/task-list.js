'use strict';

function TaskListController($scope, $timeout, $state, tasks, NotifyingService, BoldedService, MultipleSelectService, DiscussionsService, TasksService, ProjectsService, context, UsersService) {

    let me;
    UsersService.getMe().then(function(result) {
        me = result;
    });

    $scope.items = tasks.data || tasks;

    var subTasks = [];
    $scope.items.forEach(function (item) {
        if (item.subTasks && item.subTasks.length > 0) {
            return subTasks = subTasks.concat(item.subTasks.filter(function (subTask) {
                return subTask !== 'undefined';
            }));
        }
    });

    if(context.entityName !== 'my'){
        subTasks && subTasks.forEach(function (item) {
            $scope.items.push(item);
        });
    }

    $scope.loadNext = tasks.next;
    $scope.loadPrev = tasks.prev;

    $scope.entityName = 'tasks';
    $scope.entityRowTpl = '/icu/components/task-list/task-row.html';

    var creatingStatuses = {
        NotCreated: 0,
        Creating: 1,
        Created: 2
    };

    $scope.getBoldedClass = function(entity){
        return BoldedService.getBoldedClass(entity, 'tasks');
    };

    $scope.update = function(item) {
        return TasksService.update(item);
    };

    $scope.create = function(parent) {
        var newItem = {
            title: '',
            watchers: [],
            tags: [],
            __state: creatingStatuses.NotCreated,
            __autocomplete: false
        };
        if(parent){
            newItem[parent.type] = parent.id;
        }
        return TasksService.create(newItem).then(function(result) {
            $scope.items.push(result);
            TasksService.data.push(result);
            return result;
        }).then( item => {
            let updated = false;
            if(parent && parent.type === 'project') {
                return ProjectsService.getById(context.entityId).then((parentEntity) => {
                  let parentParams = _.pick(parentEntity, ['watchers', 'permissions']);
                  Object.assign(item, parentParams);
                  updated = !updated;
                  return {item, updated};
                }).then( res => {
                  if(res.updated)TasksService.update(res.item);
                  return res.item;
                } );

            }
            return item;
        })
    };

    $scope.loadMore = function (start, LIMIT, sort) {
        return new Promise((resolve) => {
            if (!$scope.isLoading && $scope.loadNext) {
                $scope.isLoading = true;
                return $scope.loadNext()
                    .then(function (items) {
                        _(items.data).each(function (p) {
                            p.__state = creatingStatuses.Created;
                        });

                        var offset = $scope.displayOnly ? 0 : 1;

                        if (items.data.length) {
                            var index = $scope.items.length - offset;
                            var args = [index, 0].concat(items.data);

                            [].splice.apply($scope.items, args);
                        }

                        $scope.loadNext = items.next;
                        $scope.loadPrev = items.prev;
                        $scope.isLoading = false;

                        return resolve(items.data);
                    });
            }
            return resolve([]);
        })
    };

    $scope.getFilter = function() {
        var a = TasksService.filterValue;
        switch (a) {
        case 'today':
            return 'tasksDueToday';
        case 'week':
            return 'tasksDueThisWeek';
        case 'watched':
            return 'watchedTasks';
        case 'overdue':
            return 'overdueTasks';
        default:
            return ''
        }
    }

    function init() {
        if (context.entity) {
            if (!context.entity.parent) {
                if (context.entity.project) {
                    $scope.parentState = 'byentity';
                    $scope.parentEntity = 'project';
                    $scope.parentEntityId = context.entity.project._id;
                    $scope.parentId = context.entity.id;
                } else if (context.entity.discussions) {
                    $scope.parentState = 'byentity';
                    $scope.parentEntity = 'discussion';
                    if (context.entity.discussions[0])
                        $scope.parentEntityId = context.entity.discussions[0]._id;
                    $scope.parentId = context.entity.id;
                }
            }
            if (context.entityName === 'project') {
                ProjectsService.selected = context.entity;
            } else if (context.entityName === 'discussion') {
                $scope.discussionContext = context.entity;
                $scope.firstStr = '';
                $scope.secondStr = '';
                if ($scope.discussionContext.startDate) {
                    $scope.discussionContext.startDate = new Date($scope.discussionContext.startDate);
                    var startStr = $scope.discussionContext.startDate.getDate() + "/" + ($scope.discussionContext.startDate.getMonth() + 1) + "/" + $scope.discussionContext.startDate.getFullYear();
                    $scope.firstStr = startStr;
                }
                if ($scope.discussionContext.allDay) {
                    $scope.secondStr = "All day long";
                } else {
                    if ($scope.discussionContext.startTime) {
                        $scope.discussionContext.startTime = new Date($scope.discussionContext.startTime);
                        var ho = $scope.discussionContext.startTime.getHours().toString().length == 1 ? "0" + $scope.discussionContext.startTime.getHours().toString() : $scope.discussionContext.startTime.getHours().toString();
                        var min = $scope.discussionContext.startTime.getMinutes().toString().length == 1 ? "0" + $scope.discussionContext.startTime.getMinutes().toString() : $scope.discussionContext.startTime.getMinutes().toString();
                        startStr = ho + ":" + min;
                        $scope.firstStr = $scope.discussionContext.startDate ? $scope.firstStr + " " + startStr : '';
                    }
                    if ($scope.discussionContext.endDate) {
                        $scope.discussionContext.endDate = new Date($scope.discussionContext.endDate);
                        if ($scope.firstStr != 'deadline') {
                            $scope.firstStr = $scope.firstStr;
                        } else {
                            $scope.firstStr = "";
                        }
                        var endStr = $scope.discussionContext.endDate.getDate() + "/" + ($scope.discussionContext.endDate.getMonth() + 1) + "/" + $scope.discussionContext.endDate.getFullYear();
                        $scope.secondStr = endStr;
                        if ($scope.discussionContext.endTime) {
                            $scope.discussionContext.endTime = new Date($scope.discussionContext.endTime);
                            var ho = $scope.discussionContext.endTime.getHours().toString().length == 1 ? "0" + $scope.discussionContext.endTime.getHours().toString() : $scope.discussionContext.endTime.getHours().toString();
                            var min = $scope.discussionContext.endTime.getMinutes().toString().length == 1 ? "0" + $scope.discussionContext.endTime.getMinutes().toString() : $scope.discussionContext.endTime.getMinutes().toString();
                            endStr = ho + ":" + min;
                            $scope.secondStr = $scope.secondStr + " " + endStr;
                        }
                    }
                }

            }
        } else {
            $scope.parentState = 'byparent';
            $scope.parentEntity = 'task';
            if (context.entity) {
                $scope.parentEntityId = context.entity.parent;
                $scope.parentId = context.entity.id;
            }
        }
    }

    init();

    $scope.getProjName = function() {
        var entityType = $scope.currentContext.entityName;
        if ($scope.currentContext != undefined && $scope.currentContext.entity != undefined && $scope.currentContext.entity.title != undefined) {
            return $scope.currentContext.entity.title;
        } else if ($scope.currentContext != undefined && $scope.currentContext.entity != undefined && $scope.currentContext.entity.name != undefined) {
            return $scope.currentContext.entity.name;
        } else {
            if (entityType == "discussion" && DiscussionsService.currentDiscussionName != undefined) {
                return DiscussionsService.currentDiscussionName;
            } else if (ProjectsService.currentProjectName != undefined) {
                return ProjectsService.currentProjectName;
            } else {
                var tasks = $scope.tasks;
                if (tasks.length == 1) {
                    $state.go('401');
                    return "you dont have permission";
                } else if (tasks.length) {
                    var task = tasks[0];
                    var result;
                    if (task.project != undefined) {
                        result = task.project.title
                    } else if (task.discussions != undefined && task.discussions.title != undefined) {
                        result = task.discussions[0].title;
                    } else {
                        result = "you dont have permission";
                    }
                    return result;
                }
            }

        }
    };

    $scope.subEntity = $scope.getProjName();
}

angular.module('mean.icu.ui.tasklist', []).controller('TaskListController', TaskListController);
