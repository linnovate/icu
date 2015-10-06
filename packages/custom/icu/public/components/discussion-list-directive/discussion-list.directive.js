'use strict';

angular.module('mean.icu.ui.discussionlistdirective', [])
.directive('icuDiscussionList', function ($state, $uiViewScroll, $stateParams, context) {
    var creatingStatuses = {
        NotCreated: 0,
        Creating: 1,
        Created: 2
    };

    function controller($scope, DiscussionsService) {
        $scope.context = context;

        _($scope.discussions).each(function(d) {
            d.__state = creatingStatuses.created;
        });

        var newDiscussion = {
            title: '',
            watchers: [],
            tags: [],
            __state: creatingStatuses.NotCreated,
            __autocomplete: false
        };

        $scope.discussions.push(_(newDiscussion).clone());

        $scope.detailsState = context.entityName === 'all' ? 'main.discussions.all.details' : 'main.discussions.byentity.details';

        $scope.showDetails = function (discussion) {
            if (context.entityName === 'all') {
                $state.go('main.discussions.all.details', {
                    id: discussion._id
                });
            } else {
                $state.go('main.discussions.byentity.details', {
                    id: discussion._id,
                    entity: context.entityName,
                    entityId: context.entityId
                });
            }
        };

        $scope.createOrUpdate = function(discussion) {
            if (discussion.__state === creatingStatuses.NotCreated) {
                discussion.__state = creatingStatuses.Creating;

                return DiscussionsService.create(discussion).then(function(result) {
                    discussion.__state = creatingStatuses.Created;

                    if (context.entityName !== 'all') {
                        discussion[context.entityName] = context.entity;
                    }

                    $scope.discussions.push(_(newDiscussion).clone());

                    return discussion;
                });
            } else if (discussion.__state === creatingStatuses.Created) {
                return DiscussionsService.update(discussion);
            }
        };
    }

    function link($scope, $element) {
        var isScrolled = false;

        $scope.initialize = function($event, discussion) {
            if ($scope.displayOnly) {
                return;
            }

            var nameFocused = angular.element($event.target).hasClass('name');

            if (discussion.__state === creatingStatuses.NotCreated) {
                $scope.createOrUpdate(discussion).then(function() {
                    $state.go($scope.detailsState, {
                        id: discussion._id,
                        entity: context.entityName,
                        entityId: context.entityId,
                        nameFocused: nameFocused
                    });
                });
            } else {
                $state.go($scope.detailsState, {
                    id: discussion._id,
                    entity: context.entityName,
                    entityId: context.entityId,
                    nameFocused: nameFocused
                });
            }
        };

        $scope.isCurrentState = function (id) {
            var isActive = ($state.current.name.indexOf('main.discussions.byentity.details') === 0 ||
                            $state.current.name.indexOf('main.discussions.all.details') === 0
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

                $scope.discussions[index].__autocomplete = false;

                if ($scope.discussions.length - 2 === index) {
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
        templateUrl: '/icu/components/discussion-list-directive/discussion-list.directive.template.html',
        scope: {
            discussions: '=',
            drawArrow: '=',
            groupDiscussions: '=',
            order: '='
        },
        link: link,
        controller: controller
    };
});
