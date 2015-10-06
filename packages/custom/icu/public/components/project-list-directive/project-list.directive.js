'use strict';

angular.module('mean.icu.ui.projectlistdirective', [])
    .directive('icuProjectList', function ($state, $uiViewScroll, $stateParams, context) {
        var creatingStatuses = {
            NotCreated: 0,
            Creating: 1,
            Created: 2
        };

        function controller($scope, ProjectsService) {
            $scope.context = context;

            _($scope.projects).each(function(p) {
                p.__state = creatingStatuses.Created;
            });

            var newProject = {
                title: '',
                color: 'b9e67d',
                watchers: [],
                __state: creatingStatuses.NotCreated,
                __autocomplete: true
            };

            $scope.projects.push(_(newProject).clone());

            $scope.detailsState = context.entityName === 'all' ? 'main.projects.all.details' : 'main.projects.byentity.details';

            $scope.createOrUpdate = function(project) {
                if (project.__state === creatingStatuses.NotCreated) {
                    project.__state = creatingStatuses.Creating;

                    return ProjectsService.create(project).then(function(result) {
                        project.__state = creatingStatuses.Created;

                        if (context.entityName !== 'all') {
                            project[context.entityName] = context.entity;
                        }

                        $scope.projects.push(_(newProject).clone());

                        return project;
                    });
                } else if (project.__state === creatingStatuses.Created) {
                    var data = {
                        name: 'renamed'
                    };
                    return ProjectsService.update(project, data);
                }
            };
        }



        function link($scope, $element) {
            var isScrolled = false;

            $scope.initialize = function($event, project) {
                if ($scope.displayOnly) {
                    return;
                }

                var nameFocused = angular.element($event.target).hasClass('name');

                if (project.__state === creatingStatuses.NotCreated) {
                    $scope.createOrUpdate(project).then(function() {
                        $state.go($scope.detailsState, {
                            id: project._id,
                            entity: context.entityName,
                            entityId: context.entityId,
                            nameFocused: nameFocused
                        });
                    });
                } else {
                    $state.go($scope.detailsState, {
                        id: project._id,
                        entity: context.entityName,
                        entityId: context.entityId,
                        nameFocused: nameFocused
                    });
                }
            };

            $scope.isCurrentState = function (id) {
                var isActive = ($state.current.name.indexOf('main.projects.byentity.details') === 0 ||
                                $state.current.name.indexOf('main.projects.all.details') === 0
                           ) && $state.params.id === id;

                if (isActive && !isScrolled) {
                    $uiViewScroll($element.find('[data-id="' + $stateParams.id + '"]'));
                    isScrolled = true;
                }

                return isActive;
            };

            $scope.onEnter = function($event, index) {
                if ($event.keyCode === 13) {
                    $event.preventDefault();

                    $scope.projects[index].__autocomplete = false;

                    if ($scope.projects.length - 2 === index) {
                        $element.find('td.name:nth-child(1)')[0].focus();
                    }
                }
            };


            // infinite scroll
            $scope.displayLimit = Math.floor(innerHeight/ 50);
            $scope.loadMore = function() {
                $scope.displayLimit += 20;
            };
        }

        return {
            restrict: 'A',
            templateUrl: '/icu/components/project-list-directive/project-list.directive.template.html',
            scope: {
                projects: '=',
                drawArrow: '=',
                order: '=',
                displayOnly: '='
            },
            link: link,
            controller: controller
        };
    });
