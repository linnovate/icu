'use strict';

angular.module('mean.icu.ui.folderlistdirective', ['dragularModule'])
    .directive('icuFolderList', function ($state, $uiViewScroll, $stateParams, $timeout, context, UsersService, LayoutService) {
        var creatingStatuses = {
            NotCreated: 0,
            Creating: 1,
            Created: 2
        };

        function controller($scope, orderService, FoldersService, dragularService, $element, $interval, $window) {
            $scope.currentFolderId = function (id) {
                $scope.folderId = id;
            };
            if(($scope.order != null) && ($scope.order.field == "custom")){
                var timer,
                    container = $('.containerVertical'),
                    scroll = $('.list-table'),
                    box = $('middlepane-container'),
                    topBar = $('.filters'),
                    buttomBar = $('.bottomBar');

                dragularService.cleanEnviroment();

                dragularService(container, {
                    scope: $scope,
                    boundingBox: box,
                    lockY: true,
                    moves: function (el, container, handle) {
                        return handle.className === 'move';
                    }
                });

                $scope.$on('dragulardrag', function (e, el) {
                    e.stopPropagation();
                    $('tr').removeClass('active')
                    el.className = 'active';
                });

                $scope.$on('dragulardrop', function (e, el, targetcontainer, sourcecontainer, conmodel, elindex, targetmodel, dropindex) {
                    e.stopPropagation();
                     $state.go($scope.detailsState + '.activities', {
                         id: $scope.folderId,
                         entity: context.entityName,
                         entityId: context.entityId
                     }, { reload: false });

                    orderService.setOrder(e, elindex, dropindex, $scope.folders.length - 1);
                });

                // $scope.$on('dragularrelease', function (e, el) {
                //     e.stopPropagation();
                //     $state.go($scope.detailsState + '.activities', {
                //         id: $scope.folderId,
                //         entity: context.entityName,
                //         entityId: context.entityId
                //     }, { reload: false });
                // });

                registerEvents(topBar, scroll, -4);
                registerEvents(buttomBar, scroll, 4);

                function registerEvents(bar, container, inc, speed) {
                    if (!speed) {
                        speed = 20;
                    }
                    angular.element(bar).on('dragularenter', function () {
                        container[0].scrollTop += inc;
                        timer = $interval(function moveScroll() {
                            container[0].scrollTop += inc;
                        }, speed);
                    });
                    angular.element(bar).on('dragularleave dragularrelease', function () {
                        $interval.cancel(timer);
                    });
                }
        };
            $scope.context = context;
            $scope.isLoading = true;

            var newFolder = {
                title: '',
                color: '0097A7',
                watchers: [],
                __state: creatingStatuses.NotCreated,
                __autocomplete: true
            };

            _($scope.folders).each(function (t) {
                t.__state = creatingStatuses.Created;
                t.PartTitle = t.title;
            });

            if (!$scope.displayOnly) {
                if (context.entityName === 'my') {
                    UsersService.getMe().then(function (me) {
                        newFolder.assign = me._id;
                        $scope.folders.push(_(newFolder).clone());
                    });
                } else {
                    delete newFolder.assign;
                    if (context.entityName === 'folder') {
                        // newFolder.parent = context.entity._id;
                        $scope.folders.push(_(newFolder).clone());
                    } else
                        $scope.folders.push(_(newFolder).clone());
                }
            }


            if (context.entityName === 'all') {
                $scope.detailsState = 'main.folders.all.details';
            } else if (context.entityName === 'my') {
                $scope.detailsState = 'main.folders.byassign.details';
            } else if (context.entityName === 'folder') {
                $scope.detailsState = 'main.folders.byparent.details';
            } else {
                $scope.detailsState = 'main.folders.byentity.details';
            }

            $scope.createOrUpdate = function (folder) {
                if (context.entityName !== 'all') {
                    folder[context.entityName] = context.entity;
                }

                if (folder.__state === creatingStatuses.NotCreated) {
                    folder.__state = creatingStatuses.Creating;
                    if (folder.office) {
                        folder.watchers = folder.watchers.concat(folder.office.watchers);
                        folder.watchers = _.map(_.groupBy(folder.watchers,function(doc){
                            return doc._id;
                        }),function(grouped){
                            return grouped[0];
                        });
                    }
                    return FoldersService.create(folder).then(function (result) {
                        folder.__state = creatingStatuses.Created;

                        $scope.folders.push(_(newFolder).clone());

                        FoldersService.data.push(folder);

                        return folder;
                    });
                } else if (folder.__state === creatingStatuses.Created) {

                    folder.title = folder.PartTitle;
                    if (folder.office) {
                        folder.watchers = folder.watchers.concat(folder.office.watchers);
                        folder.watchers = _.map(_.groupBy(folder.watchers,function(doc){
                            return doc._id;
                        }),function(grouped){
                            return grouped[0];
                        });
                    }
                    return FoldersService.update(folder);
                }
            };
            $scope.debouncedUpdate = _.debounce($scope.createOrUpdate, 1);

            $scope.searchResults = [];

            $scope.search = function (folder) {
                if (context.entityName !== 'discussion') {
                    return;
                }

                if (!folder.__autocomplete) {
                    return;
                }

                var term = folder.title;
                if (!term) {
                    return;
                }

                $scope.searchResults.length = 0;
                $scope.selectedSuggestion = 0;
                FoldersService.search(term).then(function (searchResults) {
                    _(searchResults).each(function (sr) {
                        var alreadyAdded = _($scope.folders).any(function (t) {
                            return t._id === sr._id;
                        });

                        if (!alreadyAdded) {
                            $scope.searchResults.push(sr);
                        }
                    });
                    $scope.selectedSuggestion = 0;
                });

            };

            $scope.select = function (selectedFolder) {
                var currentFolder = _($scope.folders).findIndex(function (t) {
                    return t.id === $state.params.id;
                });

                // FoldersService.remove(currentFolder._id);

                // _(currentFolder).assign(selectedFolder);
                // currentFolder.__autocomplete = false;

                // $scope.searchResults.length = 0;
                // $scope.selectedSuggestion = 0;

                $scope.createOrUpdate($scope.folders[currentFolder + 1]).then(function (folder) {
                    $state.go($scope.detailsState, {
                        id: folder._id,
                        entity: context.entityName,
                        entityId: context.entityId
                    });
                });
            };

        }

        function link($scope, $element) {
            var isScrolled = false;

            $scope.initialize = function ($event, folder) {
                if ($scope.displayOnly) {
                    return;
                }

                var nameFocused = angular.element($event.target).hasClass('name') || angular.element($event.target).parent().hasClass('name');
                folder.PartTitle = folder.title;

                if (folder.__state === creatingStatuses.NotCreated) {
                    $scope.createOrUpdate(folder).then(function () {
                        $state.go($scope.detailsState, {
                            id: folder._id,
                            entity: context.entityName,
                            entityId: context.entityId,
                            nameFocused: nameFocused
                        });
                    });
                } else {
                    $state.go($scope.detailsState + '.activities', {
                        id: folder._id,
                        entity: context.entityName,
                        entityId: context.entityId,
                        nameFocused: nameFocused
                    });
                }

                LayoutService.clicked();

            };

            $scope.isCurrentState = function (id) {
                var isActive = ($state.current.name.indexOf('main.folders.byparent.details') === 0 ||
                    $state.current.name.indexOf('main.folders.byentity.details') === 0 ||
                    $state.current.name.indexOf('main.folders.all.details') === 0
                ) && $state.params.id === id;

                if (isActive && !isScrolled) {
                    $uiViewScroll($element.find('[data-id="' + $stateParams.id + '"]'));
                    isScrolled = true;
                }

                return isActive;
            };

            $scope.onEnter = function ($event, index) {
                if ($event.keyCode === 13 || $event.keyCode === 9) {
                    $event.preventDefault();

                    $scope.folders[index].__autocomplete = false;
                    if ($element.find('td.name')[index + 1]) {
                        $element.find('td.name')[index + 1].focus();
                    }
                    else {
                        $timeout(function () {
                            $element.find('td.name')[index + 1].focus();
                        }, 500);
                    }

                }
            };

            $scope.focusAutoComplete = function ($event) {
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

            $scope.hideAutoComplete = function (folder) {

                folder.PartTitle = folder.title

                folder.__autocomplete = false;
                $scope.searchResults.length = 0;
                $scope.selectedSuggestion = 0;
            };

            // infinite scroll
            $timeout(function () {
                $scope.displayLimit = Math.ceil($element.height() / 50);
                $scope.isLoading = false;
            }, 0);

            $scope.loadMore = function () {
                if (!$scope.isLoading && $scope.loadNext) {
                    $scope.isLoading = true;
                    $scope.loadNext().then(function (folders) {

                     _(folders.data).each(function(t) {
                        t.__state = creatingStatuses.Created;
                        t.PartTitle = t.title;
                     });

                        var offset = $scope.displayOnly ? 0 : 1;

                        if (folders.data.length) {
                            var index = $scope.folders.length - offset;
                            $scope.folders.pop();
                            var args = [index, 0].concat(folders.data);
                            [].splice.apply($scope.folders, args);
                            $scope.folders.push(_(newFolder).clone());
                        }

                        $scope.loadNext = folders.next;
                        $scope.loadPrev = folders.prev;
                        $scope.isLoading = false;
                    });
                }
            };
        }



        return {
            restrict: 'A',
            templateUrl: '/icu/components/folder-list-directive/folder-list.directive.template.html',
            scope: {
                folders: '=',
                loadNext: '=',
                loadPrev: '=',
                drawArrow: '=',
                groupFolders: '=',
                order: '=',
                displayOnly: '=',
                autocomplete: '='
            },
            link: link,
            controller: controller
        };
    });
