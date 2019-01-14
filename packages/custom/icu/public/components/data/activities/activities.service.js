'use strict';

angular.module('mean.icu.data.activitiesservice', [])
.service('ActivitiesService', function (ApiUri, $http, UsersService, WarningsService, PaginationService) {
    var EntityPrefix = '/updates';
    var data ;

    function getByUserId(id, start, limit, sort) {
        var qs = querystring.encode({
            start: start,
            limit: limit,
            sort: sort
        });

        if (qs.length) {
            qs = '?' + qs;
        }

        return $http.get(ApiUri + EntityPrefix + '/byUser/' + id + qs)
            .then( result => result.data )
            .catch(err => {
                console.error("No activities found");
                let noResults = {};
                noResults.data = [];
                return noResults;
            })
    }

    function checkForTitleUpdateNeeded(oldTitle, newTitle){
        let stripedHtml = text => text.replace(/<[^>]+>/g, '');
        return stripedHtml(oldTitle) !== stripedHtml(newTitle);
    }

    function getUser(updates) {
        return UsersService.getAll().then(function(users) {
            return updates.map(function (u) {
                u.user = _(users).find(function (c) {
                    return c._id === u.creator;
                });
                return u;
            });
        });
    }

    function getById(id) {
        return $http.get(ApiUri + EntityPrefix + '/' + id).then(function(result) {
        	WarningsService.setWarning(result.headers().warning);
            return getUser([result.data]).then(function(updates) {
                return updates[0];
            });
        });
    }

    function getByProjectId(id) {
        return $http.get(ApiUri + '/projects/' + id + EntityPrefix).then(function(updatesResult) {
        	WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function getByOfficeDocumentId(id) {
        return $http.get(ApiUri + '/officeDocuments/' + id + EntityPrefix).then(function(updatesResult) {
            WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function getByTaskId(id) {
        return $http.get(ApiUri + '/tasks/' + id + EntityPrefix).then(function(updatesResult) {
        	WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function getByTasks() {
        return $http.get(ApiUri + '/tasks/myTasks'  + EntityPrefix).then(function(updatesResult) {
        	WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function getByDiscussionId(id) {
        return $http.get(ApiUri + '/discussions/' + id + EntityPrefix).then(function(updatesResult) {
        	WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function getByOfficeId(id) {
        return $http.get(ApiUri + '/offices/' + id + EntityPrefix).then(function(updatesResult) {
        	WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function getByTemplateDocId(id) {
        return $http.get(ApiUri + '/templateDocs/' + id + EntityPrefix).then(function(updatesResult) {
        	WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function getByFolderId(id) {
        return $http.get(ApiUri + '/folders/' + id + EntityPrefix).then(function(updatesResult) {
        	WarningsService.setWarning(updatesResult.headers().warning);
            return getUser(updatesResult.data);
        });
    }

    function create(update) {
      if(!activitiesChecksMap[update.data.updateField](update.data.prev, update.data.current))
        return;

      return $http.post(ApiUri + EntityPrefix, update).then(function (result) {
            WarningsService.setWarning(result.headers().warning);
            return result.data;
        });
    }

    const activitiesChecksMap = {
        'title': checkForTitleUpdateNeeded
    };

    return {
        getById: getById,
        getByUserId: getByUserId,
        getByTaskId: getByTaskId,
        getByProjectId: getByProjectId,
        getByDiscussionId: getByDiscussionId,
        getByTasks: getByTasks,
        create: create,
        data: data,
        getByOfficeId: getByOfficeId,
        getByTemplateDocId: getByTemplateDocId,
        getByFolderId: getByFolderId,
        getByOfficeDocumentId:getByOfficeDocumentId
    };
});
