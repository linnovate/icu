'use strict';

angular.module('mean.icu.ui.discussionlist', [])
    .controller('DiscussionListController', function ($scope,
                                                        $window,
                                                      $state,
                                                      discussions,
                                                      DiscussionsService,
                                                      context,
                                                      $filter,
                                                      $stateParams,
                                                      EntityService) {
        $scope.discussions = discussions.data || discussions;
        $scope.loadNext = discussions.next;
        $scope.loadPrev = discussions.prev;
        $scope.print = function() {
            $window.print()
        }

        $scope.starred = $stateParams.starred;
        if ($scope.discussions.length > 0 && !$scope.discussions[$scope.discussions.length - 1].id) {
		    $scope.discussions = [$scope.discussions[0]];
        }

        // activeToggle
        $scope.activeToggleList = EntityService.activeToggleList;
        $scope.activeToggle = {
                field: !EntityService.isActiveStatusAvailable() ? 'all' : $stateParams.activeToggle || 'active',
                disabled: !EntityService.isActiveStatusAvailable()
        };
        /*---*/


        $scope.isCurrentState = function() {
            return $state.current.name.indexOf('main.discussions.byentity') === 0 &&
                $state.current.name.indexOf('details') === -1;
        };

        $scope.reverse = true;

        $scope.changeOrder = function () {
            $scope.reverse = !$scope.reverse;

            if($scope.sorting.field != "custom"){
               $scope.sorting.isReverse = !$scope.sorting.isReverse;
            }

            /*Made By OHAD - Needed for reversing sort*/
            $state.go($state.current.name, { sort: $scope.sorting.field });
        };

        $scope.sorting  = {
            field: $stateParams.sort || 'created',
            isReverse: false
        };

        // $scope.$watch('sorting.field', function(newValue, oldValue) {
        //     if (newValue && newValue !== oldValue) {
        //         $state.go($state.current.name, { sort: $scope.sorting.field });
        //     }
        // });

        $scope.sortingList = [
            {
                title: 'due',
                value: 'due'
            }, {
                title: 'title',
                value: 'title'
            }, {
                title: 'status',
                value: 'status'
            }, {
                title: 'created',
                value: 'created'
            }
        ];

        if(context.entityName != "all"){
            $scope.sortingList.push({
                title: 'custom',
                value: 'custom'
            });
        };

        function navigateToDetails(discussion) {
            if(!discussion) return ;

            $scope.detailsState = context.entityName === 'all' ?
                'main.discussions.all.details' : 'main.discussions.byentity.details';

            $state.go($scope.detailsState, {
                id: discussion._id,
                entity: $scope.currentContext.entityName,
                entityId: $scope.currentContext.entityId
            });
        }

        $scope.toggleStarred = function () {
            $state.go($state.current.name, { starred: !$stateParams.starred });
        };

        $scope.filterActive = function () {
            EntityService.activeStatusFilterValue = $scope.activeToggle.field ;
            $state.go($state.current.name, { activeToggle: $scope.activeToggle.field });
        };

        let possibleNavigate = $scope.discussions.filter(function(t) {
            return t.recycled == null ;
        })

        if (possibleNavigate.length) {
            if ($state.current.name === 'main.discussions.all' ||
                $state.current.name === 'main.discussions.byentity') {
                navigateToDetails(possibleNavigate[0]);
            }
        } else {
            if ($state.current.name === 'main.discussions.all') {
                return;
            }
            if ($state.current.name !== 'main.discussions.byentity.activities' &&
                $state.current.name !== 'main.discussions.byentity.details.activities') {
                $state.go('.activities');
            }
        }
    });
