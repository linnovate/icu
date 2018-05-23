'use strict';

angular.module('mean.icu.ui.entity', [])
.service('EntityService', function (ApiUri, $http, PaginationService, WarningsService, ActivitiesService, MeanSocket, SettingServices) {

    var activeStatusFilterValue = "default" ;

    let entityTypes = [
        'projects',
        'tasks',
        'discussions',
        'updates',
        'offices',
        'folders',
        'officeDocuments'
    ]      
    

    function getByEntityId(type,id) {
        let entityType = entityTypes.find(elem => elem.includes(type)) ;
        
        if (entityType == null) return Promise.resolve(null) ; 
        return $http.get(ApiUri + '/' + entityType + '/' + id).then(function (result) {
        	WarningsService.setWarning(result.headers().warning);
            return result.data;
        });
    }


    function isActiveStatusAvailable() {
        return SettingServices.activeStatusConfigured == null ? false : true ;
    }

    function getActiveStatusFilterValue() {
        return activeStatusFilterValue ;
    }

    function setActiveStatusFilterValue(_activeStatusFilterValue) {
        activeStatusFilterValue = _activeStatusFilterValue ;
    }

    function getEntityActivityStatus(filterValue,entityType,entityStatus) {
        return SettingServices.getIsActiveStatus(filterValue,entityType,entityStatus)  ;
    }

    var activeToggleList = [
		{
			title: 'Active',
			value: 'active'
		}, {
			title: 'Archived',
			value: 'nonactive'
		},
		{
			title: 'All',
			value: 'all'
		}
	];


    function recycle(type,id) {
        return $http.patch(ApiUri + '/' + type +  '/' + id + '/recycle').then(function (result) {
            
        	WarningsService.setWarning(result.headers().warning);
            return result.data;
        });
    }

    function recycleRestore(type,id) {
        return $http.patch(ApiUri + '/' + type +  '/' + id + '/recycle_restore').then(function (result) {
            
        	WarningsService.setWarning(result.headers().warning);
            return result.data;
        });
    }

    function getRecycleBin(type) {
    	return $http.get(ApiUri + '/' + type + '/get_recycle_bin').then(function (result) {
    		WarningsService.setWarning(result.headers().warning);
            return result.data;
        });
    }
    function getSearchAll(type) {
    	return $http.get(ApiUri  + '/get_search_all').then(function (result) {
    		WarningsService.setWarning(result.headers().warning);
            return result.data;
        });
    }


    return {
        getByEntityId: getByEntityId,
        isActiveStatusAvailable, isActiveStatusAvailable,
        getActiveStatusFilterValue: getActiveStatusFilterValue,
        setActiveStatusFilterValue: setActiveStatusFilterValue,
        activeStatusFilterValue: activeStatusFilterValue,
        getEntityActivityStatus: getEntityActivityStatus,
        activeToggleList: activeToggleList,   
        recycle: recycle,  
        recycleRestore: recycleRestore,   
        getRecycleBin: getRecycleBin,
        getSearchAll: getSearchAll
        
    };
}) ;
