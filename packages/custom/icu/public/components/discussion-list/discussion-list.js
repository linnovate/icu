'use strict';

function DiscussionListController($scope, $state, discussions, DiscussionsService, context, $stateParams, EntityService) {

    $scope.items = discussions.data || discussions;
    $scope.loadNext = discussions.next;
    $scope.loadPrev = discussions.prev;

    $scope.entityName = 'discussions';
    $scope.entityRowTpl = '/icu/components/discussion-list/discussion-row.html';
    
    var creatingStatuses = {
        NotCreated: 0,
        Creating: 1,
        Created: 2
    };

    $scope.update = function(item) {
        return DiscussionsService.update(item.title);
    }

    $scope.create = function(item) {
        var newItem = {
            title: '',
            watchers: [],
            tags: [],
            __state: creatingStatuses.NotCreated,
            __autocomplete: false
        };
        return DiscussionsService.create(newItem).then(function(result) {
            $scope.items.push(result);
            DiscussionsService.data.push(result);
            return result;
        });
    }

//     $scope.search = function(item) {
//         return DiscussionsService.search(term).then(function(searchResults) {
//             _(searchResults).each(function(sr) {
//                 var alreadyAdded = _($scope.items).any(function(p) {
//                     return p._id === sr._id;
//                 });

//                 if (!alreadyAdded) {
//                     return $scope.searchResults.push(sr);
//                 }
//             });
//             $scope.selectedSuggestion = 0;
//         });
//     }

    $scope.loadMore = function(start, LIMIT, sort) {
        if (!$scope.isLoading && $scope.loadNext) {
            $scope.isLoading = true;
            $scope.loadNext().then(function(items) {

                _(items.data).each(function(p) {
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
            });
        }
    }

    $scope.getDate = function(discussion) {
        // $scope.discussionContext = context.entity;
        discussion.firstStr = '';
        discussion.secondStr = '';
        if (discussion.startDate) {
            discussion.startDate = new Date(discussion.startDate);
            var startStr = discussion.startDate.getDate() + "/" + (discussion.startDate.getMonth() + 1) + "/" + discussion.startDate.getFullYear();
            discussion.firstStr = startStr;
        }
        if (discussion.allDay) {
            discussion.secondStr = "All day long";
        } else {
            if (discussion.startTime) {
                discussion.startTime = new Date(discussion.startTime);
                var ho = discussion.startTime.getHours().toString().length == 1 ? "0" + discussion.startTime.getHours().toString() : discussion.startTime.getHours().toString();
                var min = discussion.startTime.getMinutes().toString().length == 1 ? "0" + discussion.startTime.getMinutes().toString() : discussion.startTime.getMinutes().toString();
                startStr = ho + ":" + min;
                discussion.firstStr = discussion.startDate ? discussion.firstStr + " " + startStr : '';
            }
            if (discussion.endDate) {
                discussion.endDate = new Date(discussion.endDate);
                if (discussion.firstStr != 'deadline') {
                    discussion.firstStr = discussion.firstStr;
                } else {
                    discussion.firstStr = "";
                }
                var endStr = discussion.endDate.getDate() + "/" + (discussion.endDate.getMonth() + 1) + "/" + discussion.endDate.getFullYear();
                discussion.secondStr = endStr;
                if (discussion.endTime) {
                    discussion.endTime = new Date(discussion.endTime);
                    var ho = discussion.endTime.getHours().toString().length == 1 ? "0" + discussion.endTime.getHours().toString() : discussion.endTime.getHours().toString();
                    var min = discussion.endTime.getMinutes().toString().length == 1 ? "0" + discussion.endTime.getMinutes().toString() : discussion.endTime.getMinutes().toString();
                    endStr = ho + ":" + min;
                    discussion.secondStr = discussion.secondStr + " " + endStr;
                }
            }
        }

    }

//     _($scope.items).each(function(d) {
//         d.__state = creatingStatuses.Created;
//     });

    $scope.detailsState = context.entityName === 'all' ? 'main.discussions.all.details' : 'main.discussions.byentity.details';

    $scope.showDetails = function(item) {
        if (context.entityName === 'all') {
            $state.go($scope.detailsState, {
                id: item._id
            });
        } else {
            $state.go($scope.detailsState, {
                id: item._id,
                entity: context.entityName,
                entityId: context.entityId
            });
        }
    }
}

angular.module('mean.icu.ui.discussionlist', []).controller('DiscussionListController', DiscussionListController);
