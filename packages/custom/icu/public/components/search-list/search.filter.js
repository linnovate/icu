'use strict';

angular.module('mean.icu.ui.searchlistfilter', [])
.filter('filteringByUpdated', function (SearchService,$location) {    
    return function(results) {  
        var arr = [];
        if($location.search() && $location.search().recycled) {
          for(var i = 0;i<SearchService.filteringResults.length;i++){
            if(SearchService.filteringResults[i].recycled)
                arr.push(SearchService.filteringResults[i])
          }
        }
        else {
            for(var i = 0;i<SearchService.filteringResults.length;i++){
            if(!SearchService.filteringResults[i].recycled)
                arr.push(SearchService.filteringResults[i])
            }

        }
        SearchService.filteringResults = arr;
        var filteringResults = SearchService.filteringResults.map(function(e) {
            let filterDate = new Date(SearchService.filteringByUpdated) ;
            let filterDueDate = new Date(SearchService.filteringByDueDate);
            let entityDate = new Date(e.updated);
            let entityDueDate = new Date();
            if (SearchService.filteringByDueDate && e.due) {
                entityDueDate = new Date(e.due)
            }
            let res = false;           
            if (e._type == 'officeDocument')
              e.due = e.created;
            if (SearchService.filteringByDueDate  && e.due){
                if (entityDueDate > filterDueDate && entityDate > filterDate) {
                  res = true;
                }
                else res = false;
            }
            else if (SearchService.filterDateOption && e.startDate){
                let entityStartDate = new Date(e.startDate);
                let entityEndDate = new Date(e.endDate);
                let filterStart = new Date(SearchService.filterDateOption.startDate._d || SearchService.filterDateOption.startDate);
                let filterEnd = new Date(SearchService.filterDateOption.endDate._d || SearchService.filterDateOption.endDate);
                if (entityStartDate >= filterStart && entityEndDate <= filterEnd && entityDate > filterDate) {
                    res = true;
                  }
                  else res = false;
            }
              
            else if (entityDate > filterDate)
               res = true;
            return res ? e.id : -1 ;
        });

        var out = [];
        for (var i=0; i< results.length; i++) {
            if (filteringResults.indexOf(results[i].id) > -1) {
                   out.push(results[i])
            }
        }
        return out;
    }
    return out = filteringResults ;
})
.filter('searchResultsFilter', function (SearchService,$location) {
	return function(results) {
        if ($location.path().split("/").pop() == "recycled") {
            SearchService.filteringResults = results ;     
        }

		var filteringResults = SearchService.filteringResults.map(function(e) {
            return e.id
        });

        var out = [];
        for (var i=0; i< results.length; i++) {
            if (filteringResults.indexOf(results[i].id) > -1) {
                out.push(results[i])
            }
        }
        return out;
	}
})
.filter('searchResultsLength', function (SearchService) {
    return function(length) {
        return  SearchService.filteringResults.length;
    }
    
});