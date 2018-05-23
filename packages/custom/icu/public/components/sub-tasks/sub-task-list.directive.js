'use strict';

angular.module('mean.icu.ui.subtaskslistdirective', [])
    .directive('icuSubTaskList', function($state, $uiViewScroll, $stateParams, $timeout, UsersService) {
        var creatingStatuses = {
            NotCreated: 0,
            Creating: 1,
            Created: 2
        };

        var newTask = {
            title: '',
            watchers: [],
            tags: [],
            __state: creatingStatuses.NotCreated,
            __autocomplete: true
        };

        function controller($scope, TasksService, UsersService) {
            UsersService.getAll().then(function(people) {
                $scope.people = people;
            });

            $scope.isLoading = true;
            _($scope.tasks).each(function(t) {
                if (t && t._id) {
                    t.__state = creatingStatuses.Created;
                }
            });

            if (!$scope.displayOnly) {
                if (!$scope.tasks.length || $scope.tasks[$scope.tasks.length - 1] && $scope.tasks[$scope.tasks.length - 1]._id) {
                    $scope.tasks.push(_(newTask).clone());
                }
            }

            $scope.createOrUpdate = function(task, field) {
                var data;
                var backupEntity = JSON.parse(JSON.stringify(task));
                if (field === 'assign') {
                    data = {
                        frequentUser: task.assign
                    }

                    // check the assignee is not a watcher already
                    let filtered = task.watchers.filter(watcher => {
                        return watcher._id == task.assign && watcher != null
                    });
    
                    // add assignee as watcher
                    if(filtered.length == 0) {
                        task.watchers.push(task.assign);
                    }

                    // set status assigned
                    task.status = $scope.statuses[1];
                }

                
                
                if (task.__state === creatingStatuses.NotCreated) {
                    task.__state = creatingStatuses.Creating;
                    task.parent = $scope.parent;

                    return TasksService.create(task).then(function(result) {
                        task.__state = creatingStatuses.Created;

                        TasksService.getById(task.parent).then(function(parentTask) {
                            task.watchers = parentTask.watchers ;
                        }) ;
                        $scope.tasks.push(_(newTask).clone());

                        return task;
                    });
                } else if (task.__state === creatingStatuses.Created) {
                    if (field === 'assign') {
                        UsersService.getMe().then(function(me) {
                            
                            TasksService.assign(task, me, backupEntity);
                        });
                    }
                    return TasksService.update(task, data);
                }
            };


            $scope.debouncedUpdate = _.debounce($scope.createOrUpdate, 300);

            $scope.searchResults = [];

            $scope.search = function(task) {
                if (!task.__autocomplete) {
                    return;
                }

                var term = task.title;
                if (!term) {
                    return;
                }

                $scope.searchResults.length = 0;
                $scope.selectedSuggestion = 0;
                TasksService.search(term).then(function(searchResults) {
                    _(searchResults).each(function(sr) {
                        var alreadyAdded = _($scope.tasks).any(function(t) {
                            return t._id === sr._id;
                        });

                        if (!alreadyAdded) {
                            $scope.searchResults.push(sr);
                        }
                    });
                    $scope.selectedSuggestion = 0;
                });

            };
            $scope.deleteShowDlt = function(subTask) {
                angular.forEach($scope.tasks, function(st) {
                    if (st._id !== subTask._id) {
                        subTask.showDelete = false;
                    }

                });
            }

            $scope.delete = function(subTask) {
                TasksService.remove(subTask._id).then(function(res) {
                    var taskindex = _.findIndex($scope.tasks, function(t) {
                        return t._id === res._id;
                    })
                    $scope.tasks.splice(taskindex, 1);
                });
            }

            $scope.select = function(selectedTask) {
                var currentTask = _($scope.tasks).findIndex(function(t) {
                    return t.id === $state.params.id;
                });

                $scope.createOrUpdate($scope.tasks[currentTask + 1]).then(function(task) {
                    // $state.go('main.tasks.byparent.details', {
                    //     id: task._id,
                    //     parentId: task.parent._id || task.parent
                    // });
                });
            };

            $scope.initDue = function(task) {
                if (task.due) task.due = new Date(task.due);
            }

            $scope.dueOptions = function(task) {
                return {
                    onSelect: function() {;
                        $scope.createOrUpdate(task);
                    },
                    onClose: function() {
                        if($scope.checkDate(task)){
                            document.getElementById('ui-datepicker-div').style.display = 'block';
                            $scope.open(task);
                        }else{
                            document.getElementById('ui-datepicker-div').style.display = 'none';
                            $scope.open(task);
                        }
                    },
                    dateFormat: 'd.m.yy'
                }
            };

            $scope.checkDate = function(task) {
                var d = new Date()
                d.setHours(0,0,0,0);
                if (d > task.due) {
                    return true;
                }
                return false;
            };

            $scope.open = function(task) {
                if ($scope.checkDate(task)) {
                    document.getElementById('past' + task._id).style.display = document.getElementById('ui-datepicker-div').style.display;
                    document.getElementById('past' + task._id).style.left = document.getElementById('ui-datepicker-div').style.left;
                    document.getElementById('past' + task._id).style.top = (parseInt(document.getElementById('ui-datepicker-div').style.top) + 249) + 'px';
                } else {
                    document.getElementById('past' + task._id).style.display = 'none';
                }
            };

            $scope.closeOldDateNotification = function(task){
                document.getElementById('past' + task._id).style.display = 'none';
            };

            $scope.statuses = ['new', 'assigned', 'in-progress', 'review', 'rejected', 'done'];

        }

        function link($scope, $element) {
            var isScrolled = false;
            $scope.initialize = function($event, task) {
                if ($scope.displayOnly) {
                    return;
                }

                var nameFocused = angular.element($event.target).hasClass('name');

                if (task.__state === creatingStatuses.NotCreated) {
                    $scope.createOrUpdate(task)
                    // .then(function() {
                    //         $state.go('main.tasks.byparent.details', {
                    //             id: task._id,
                    //             parentId: task.parent._id || task.parent,
                    //             nameFocused: nameFocused
                    //         });
                    //     });
                    // } else {
                    //     $state.go('main.tasks.byparent.details', {
                    //         id: task._id,
                    //         parentId: task.parent._id || task.parent,
                    //         nameFocused: nameFocused
                    //     });
                }
            };

            $scope.changeState = function(subTask) {
                $state.go('main.tasks.byparent.details', {
                    id: subTask._id,
                    entityId: subTask.parent._id || subTask.parent,
                    nameFocused: false
                });
            }

            $scope.isCurrentState = function(id) {
                var isActive = ($state.current.name.indexOf('main.tasks.byentity.details') === 0 ||
                    $state.current.name.indexOf('main.tasks.all.details') === 0
                ) && $state.params.id === id;

                if (isActive && !isScrolled) {
                    $uiViewScroll($element.find('[data-id="' + $stateParams.id + '"]'));
                    isScrolled = true;
                }

                return isActive;
            };

            $scope.onEnter = function($event, index) {
                if ($event.keyCode === 13 || $event.keyCode === 9) {
                    $event.preventDefault();

                    $scope.tasks[index].__autocomplete = false;
                    if ($element.find('td.name')[index + 1]) {
                        $element.find('td.name')[index + 1].focus();
                    } else {
                        $timeout(function() {
                            $element.find('td.name')[index + 1].focus();
                        }, 500);
                    }

                }
            };

            $scope.focusAutoComplete = function($event) {
                angular.element($event.target).css('box-shadow', 'none')
                if ($event.keyCode === 38) {
                    if ($scope.selectedSuggestion > 0) {
                        $scope.selectedSuggestion -= 1;
                    }
                    $event.preventDefault();
                } else if ($event.keyCode === 40) {
                    if ($scope.selectedSuggestion < $scope.searchResults.length - 1) {
                        $scope.selectedSuggestion += 1;
                    }
                    $event.preventDefault();
                } else if ($event.keyCode === 13 || $event.keyCode === 9) {
                    var sr = $scope.searchResults[$scope.selectedSuggestion];
                    $scope.select(sr);
                }


            };

            $scope.hideAutoComplete = function(task) {
                task.__autocomplete = false;
                $scope.searchResults.length = 0;
                $scope.selectedSuggestion = 0;
            };

            // infinite scroll
            $timeout(function() {
                $scope.displayLimit = Math.ceil($element.height() / 50);
                $scope.isLoading = false;
            }, 0);

            $scope.loadMore = function() {
                if (!$scope.isLoading && $scope.loadNext) {
                    $scope.isLoading = true;
                    $scope.loadNext().then(function(tasks) {

                        _(tasks.data).each(function(t) {
                            t.__state = creatingStatuses.Created;
                        });

                        var offset = $scope.displayOnly ? 0 : 1;

                        if (tasks.data.length) {
                            var index = $scope.tasks.length - offset;
                            $scope.tasks.pop();
                            var args = [index, 0].concat(tasks.data);
                            [].splice.apply($scope.tasks, args);
                            $scope.tasks.push(_(newTask).clone());
                        }

                        $scope.loadNext = tasks.next;
                        $scope.loadPrev = tasks.prev;
                        $scope.isLoading = false;
                    });
                }
            };
        }



        return {
            restrict: 'EA',
            templateUrl: '/icu/components/sub-tasks/sub-task-list.directive.template.html',
            scope: {
                tasks: '=',
                loadNext: '=',
                loadPrev: '=',
                drawArrow: '=',
                groupTasks: '=',
                order: '=',
                displayOnly: '=',
                autocomplete: '=',
                parent: '@',
                people: '='
            },
            link: link,
            controller: controller
        };
    });
