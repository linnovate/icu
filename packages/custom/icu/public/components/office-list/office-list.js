'use strict';

function OfficeListController($scope, $state, offices, NotifyingService, BoldedService, OfficesService, MultipleSelectService, context, $stateParams, EntityService) {

    $scope.items = offices.data || offices;

    $scope.loadNext = offices.next;
    $scope.loadPrev = offices.prev;

    $scope.entityName = 'offices';
    $scope.entityRowTpl = '/icu/components/office-list/office-row.html';

    var creatingStatuses = {
        NotCreated: 0,
        Creating: 1,
        Created: 2
    };

    $scope.update = function(item) {
        return OfficesService.update(item);
    };

    $scope.getBoldedClass = function(entity){
      return BoldedService.getBoldedClass(entity, 'offices');
    };

    $scope.create = function(item) {
        var newItem = {
            title: '',
            color: '0097A7',
            watchers: [],
            __state: creatingStatuses.NotCreated,
            __autocomplete: true
        };
        return OfficesService.create(newItem).then(function(result) {
            $scope.items.push(result);
            OfficesService.data.push(result);
            return result;
        });
    };
}

angular.module('mean.icu.ui.officelist', []).controller('OfficeListController', OfficeListController);
