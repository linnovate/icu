'use strict';

angular.module('mean.icu.ui.officedetails', []).controller('OfficeDetailsController', OfficeDetailsController);

function OfficeDetailsController($scope, entity, tasks, folders, people, offices, context, $state, OfficesService, PermissionsService, $stateParams, ActivitiesService) {

  // ==================================================== init ==================================================== //

  if (($state.$current.url.source.includes("search")) || ($state.$current.url.source.includes("offices"))) {
    $scope.item = entity || context.entity;
  } else {
    $scope.item = context.entity || entity;
  }

  if (!$scope.item) {
    $state.go('main.offices.byentity', {
      entity: context.entityName,
      entityId: context.entityId
    });
  } else if ($scope.item && ($state.current.name === 'main.offices.all.details' || $state.current.name === 'main.search.office' || $state.current.name === 'main.offices.byentity.details')) {
    $state.go('.activities');
  }

  $scope.editorOptions = {
    theme: 'bootstrap',
    buttons: ['bold', 'italic', 'underline', 'anchor', 'quote', 'orderedlist', 'unorderedlist']
  };
  $scope.statuses = ['new', 'in-progress', 'canceled', 'completed', 'archived'];

  $scope.entity = entity || context.entity;
  $scope.tasks = tasks.data || tasks;
  $scope.folders = folders.data || folders;
  $scope.items = offices.data || offices;

  // backup for previous changes - for updates
  var backupEntity = JSON.parse(JSON.stringify($scope.item));

  $scope.people = people.data || people;

  OfficesService.getStarred().then(function(starred) {
    $scope.item.star = _(starred).any(function(s) {
      return s._id === $scope.item._id;
    });
  });

  // ==================================================== onChanges ==================================================== //

  function navigateToDetails(office) {
    $scope.detailsState = context.entityName === 'all' ? 'main.offices.all.details' : 'main.offices.byentity.details';

    $state.go($scope.detailsState, {
      id: office._id,
      entity: $scope.currentContext.entityName,
      entityId: $scope.currentContext.entityId,
      starred: $stateParams.starred
    }, {
      reload: true
    });
  }

  $scope.onStar = function(value) {
    OfficesService.star($scope.item).then(function() {
      navigateToDetails($scope.item);
      // "$scope.item.star" will be change in 'ProjectsService.star' function
    });
  }

  $scope.onColor = function(value) {
    $scope.update($scope.item, value);
  }

  $scope.onWantToCreateRoom = function() {
    $scope.item.WantRoom = true;

    $scope.update($scope.item, context);

    OfficesService.WantToCreateRoom($scope.item).then(function() {
      navigateToDetails($scope.item);
    });
  }

  // ==================================================== Menu events ==================================================== //

  $scope.deleteOffice = function() {
    OfficesService.remove($scope.item._id).then(function() {
      $state.go('main.offices.all', {
        entity: 'all'
      }, {
        reload: true
      });
    });
  }

  $scope.menuItems = [{
    label: 'deleteOffice',
    icon: 'times-circle',
    display: !$scope.item.hasOwnProperty('recycled'),
    action: $scope.deleteOffice,
  }];

  // ==================================================== $watch: title / desc ==================================================== //

  $scope.$watch('office.title', function(nVal, oVal) {
    if (nVal !== oVal && oVal) {
      var newContext = {
        name: 'title',
        oldVal: oVal,
        newVal: nVal,
        action: 'renamed'
      };
      $scope.delayedUpdate($scope.item, newContext);
    }
  });

  var nText, oText;
  $scope.$watch('office.description', function(nVal, oVal) {
    nText = nVal ? nVal.replace(/<(?:.|\n)*?>/gm, '') : '';
    oText = oVal ? oVal.replace(/<(?:.|\n)*?>/gm, '') : '';
    if (nText != oText && oText) {
      var newContext = {
        name: 'description',
        oldVal: oVal,
        newVal: nVal
      };
      $scope.delayedUpdate($scope.item, newContext);
    }
  });

  $scope.$watch('office.tel', function(nVal, oVal) {
    if (nVal !== oVal) {
      var context = {
        name: 'tel',
        oldVal: oVal,
        newVal: nVal,
        action: 'changed'
      };
      $scope.delayedUpdate($scope.item, context);
    }
  });

  $scope.$watch('office.unit', function(nVal, oVal) {
    if (nVal !== oVal) {
      var context = {
        name: 'unit',
        oldVal: oVal,
        newVal: nVal,
        action: 'changed'
      };
      $scope.delayedUpdate($scope.item, context);
    }
  });

  // ==================================================== Update ==================================================== //

  $scope.update = function(office, context) {
    OfficesService.update(office, context).then(function(res) {
      if (OfficesService.selected && res._id === OfficesService.selected._id) {
        if (context.name === 'title') {
          OfficesService.selected.title = res.title;
        }
        if (context.name === 'color') {
          OfficesService.selected.color = res.color;
        }
      }
      switch (context.name) {
      case 'color':
        OfficesService.updateColor(office).then(function(result) {
          ActivitiesService.data = ActivitiesService.data || [];
          ActivitiesService.data.push(result);
        });
      case 'title':
      case 'description':
        OfficesService.updateTitle(office, backupEntity, context.name).then(function(result) {
          backupEntity = JSON.parse(JSON.stringify($scope.item));
          ActivitiesService.data = ActivitiesService.data || [];
          ActivitiesService.data.push(result);
        });
      case 'tel':
      case 'unit':
        OfficesService.updateTitle(office, backupEntity, context.name).then(function(result) {
          backupEntity = JSON.parse(JSON.stringify($scope.item));
        });
        break;
      }

    });
  }

  $scope.updateCurrentOffice = function() {
    OfficesService.currentOfficeName = $scope.item.title;
  }

  $scope.delayedUpdate = _.debounce($scope.update, 2000);

  // ==================================================== havePermissions ==================================================== //

  $scope.enableRecycled = true;
  $scope.havePermissions = function(type, enableRecycled) {
    enableRecycled = enableRecycled || !$scope.isRecycled;
    return (PermissionsService.havePermissions(entity, type) && enableRecycled);
  }

  $scope.haveEditiorsPermissions = function() {
    return PermissionsService.haveEditorsPerms($scope.entity);
  }

  $scope.permsToSee = function() {
    return PermissionsService.haveAnyPerms($scope.entity);
  }
}
