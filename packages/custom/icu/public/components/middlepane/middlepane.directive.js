'use strict';

angular.module('mean.icu.ui.middlepane', [])
.directive('icuMiddlepane', function () {
    function controller() {
    }

    return {
        restrict: 'A',
        controller: controller,
        templateUrl: '/icu/components/middlepane/middlepane.html'
    };
});

function SearchController($scope, $state, $stateParams, context, NotifyingService, TasksService, $timeout, SearchService, $document, $location) {
    $scope.$on('$stateChangeSuccess', function ($event, toState) {
        // if ($location.path().split("/").pop() == "recycled") {
        //     $scope.term = "recycled" ;
        // }
        // else {
        //     if($scope.term == "recycled") {
        //         $scope.term = $location.path().split("/").pop() ;
        //     }
        // }

        if (toState.name.indexOf('main.search') !== 0) {
            if ($stateParams.query && $stateParams.query.length) {
                $scope.term = $stateParams.query;
            } else {
                $scope.term = '';
            }
        }
    });

// function onDocumentClick() {
//         // check for flag
//         if(angular.element('#build-in-search').css('display') == 'block')
//         {
//             angular.element('#build-in-search').css('display', 'none');
//         }
//         else{
//             angular.element('#build-in-search').css('display', 'block');
//         }
//     }

//     $document.on("click", onDocumentClick);

    $scope.clearSearch = function () {
        $scope.term = '';
        search();
    };

    // $scope.focusSearch = function () {
    //     $scope.term = '';
    //     $scope.search();
    // };


    function search(term) {
        SearchService.builtInSearchArray = false;
        if (term && term.length) {
            $state.go('main.search', {query: term});
        } else {
            //$state.go('main.tasks.all');
        }
    }

    function refreshQuery(term){
        SearchService.refreshQuery(term);
    }

    $scope.builtInSearch = function(funcName) {
        $document.on("click", onDocumentClick);
    	TasksService[funcName]().then(function(res){
    		SearchService.builtInSearchArray = res;
    		$state.go('main.search', {query: ''}, {reload: true});
    	});
    };

    function activeSearchNav(){
        NotifyingService.notify('activeSearch');
    }

    $scope.startSearch = function(term){
        search(term);
        activeSearchNav();
        refreshQuery(term);
    };

    // $scope.blur = function(){
    // 	$timeout(function() {
    // 		$scope.click = false;
    // 	}, 1000);
    // }
}

angular.module('mean.icu.ui.search', [])
    .controller('SearchController', SearchController);

function MiddlepaneController() {
}

angular.module('mean.icu.ui.middlepane')
    .controller('MiddlepaneController', MiddlepaneController);
