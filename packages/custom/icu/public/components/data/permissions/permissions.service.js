'use strict';

angular.module('mean.icu.data.permissionsservice', [])
    .service('PermissionsService', function(ApiUri, $http, $stateParams, $rootScope,
                                            NotifyingService,OfficesService,UsersService,DiscussionsService,
                                            TasksService, ProjectsService, PaginationService, MeanSocket,
                                            WarningsService, ActivitiesService, FoldersService, OfficeDocumentsService,
                                            TemplateDocsService
    ) {
        var EntityPrefix = '/permissions';
        var me = UsersService.getMe().$$state.value;

        var serviceMap = {
            task: TasksService,
            tasks: TasksService,
            project: ProjectsService,
            projects: ProjectsService,
            discussion: DiscussionsService,
            discussions: DiscussionsService,
            office: OfficesService,
            offices: OfficesService,
            folder: FoldersService,
            folders: FoldersService,
            officeDocument: OfficeDocumentsService,
            officeDocuments: OfficeDocumentsService,
            templateDoc: TemplateDocsService,
            templateDocs: TemplateDocsService,
        };

        var editorPerms = {
            'summary' : true,
            'description' : true,
            'tabs' : true,
            'tags' : true,
            'tags.manageTasks' : true,
            'subs' : true,
            'info' : true,
            'tab-content' : true,
            'watchers' : true,
        };

        var commenterPerms = {
            'summary' : false,
            'description' : false,
            'tabs' : true,
            'tags' : false,
            'tags.manageTasks' : false,
            'subs' : false,
            'info' : false,
            'tab-content' : true,
            'watchers' : false,
        };

        var viewerPerms = {
            'summary' : false,
            'description' : false,
            'tabs' : true,
            'tags' : false,
            'tags.manageTasks' : false,
            'subs' : false,
            'info' : false,
            'tab-content' : false,
            'watchers' : false,
        };

        function haveAnyPerms(entity, user) {
            if(!entity.permissions)entity.permissions = [];
            user = user || me;
            var perms = !!_.find(entity.permissions, {'id': getUserId(user)});
            return perms;
        }

        function getPermissionStatus(user, entity) {
            var status = null;

            var usersPerms = _.find(entity.permissions, {'id': getUserId(user)});

            if(usersPerms){
                switch (usersPerms.level) {
                    case 'editor':
                        status = 'editor';
                        break;
                    case 'commenter':
                        status = 'commenter';
                        break;
                    case 'viewer':
                        status = 'viewer';
                        break;
                }
                return status;
            }
            return false;
        }

        function getUserId(user){
            var userId = (typeof(user) == 'string') ? user : user._id;
            return userId;
        }

        function haveEditorsPerms(entity, user){
                user = user || me;
                haveAnyPerms(entity, user);

                var havePerms = false;
                if(entity.permissions.length !== 0) {
                    var usersPerms = _.find(entity.permissions, {'id': getUserId(user)});
                    if(usersPerms){
                        havePerms = usersPerms.level === 'editor';
                    }
                }
                return havePerms;
        }

        function changeUsersPermissions(entity, user, perms, context){
            if(!haveEditorsPerms(entity)){
                return false;
            }

            var userId = getUserId(user);
            if(haveAnyPerms(entity, user)){
                _.find(entity.permissions, {'id': userId}).level = perms;
            } else {
                var newPerms = {
                    'id': userId,
                    'level': perms,
                };
                entity.permissions.push(newPerms);
            }
            var typeOfService = $stateParams.id ? context.main : context.entityName ;
            var serviceName = serviceMap[typeOfService];
            var clonedEntity = JSON.parse(JSON.stringify(entity));
            console.log("changeUsersPermissions", serviceName, clonedEntity)
            console.log(typeOfService) ;
            
            
            if(typeOfService == 'officeDocuments') {
                // Artium - see bug in documents:
                // adding 2 watchers one after the other - the permissions array give only 2 items in perms array.
                serviceName.updateWatcherPerms(clonedEntity, user, user, 'updateWatcherPerms') ;
            }
            else {
                serviceName.update(clonedEntity);
            }

            return entity;
        }

        function updateEntity(entity, context) {
            var entityService = (context.main === 'tasks' ?  TasksService :  ProjectsService);
            var backupEntity = JSON.parse(JSON.stringify(entity));

            if (context.main !== 'discussions') {
                entityService.update(entity).then(function (result) {
                    if (context.entityName === 'project') {
                        var projId = result.project ? result.project._id : undefined;
                        if (projId !== context.entityId) {
                            $state.go('main.' + context.main + '.byentity', {
                                entity: context.entityName,
                                entityId: context.entityId
                            }, {
                                reload: true
                            });
                        }
                    }
                });

                entityService.assign(entity, me, backupEntity).then(function (res) {
                    // backup for previous changes - for updates
                    ActivitiesService.data.push(res);
                });
            } else {
                DiscussionsService.update(entity);
                if (entity.assign !== undefined || entity.assign !== null) {

                    let filtered = entity.watchers.filter(watcher => {
                        // check the assignee is not a watcher already
                        return watcher === entity.assign;
                    });

                    // add assignee as watcher
                    if (filtered.length === 0) {
                        entity.watchers.push(entity.assign);
                    }
                }

                DiscussionsService.updateAssign(entity, backupEntity).then(function (result) {
                    backupEntity = JSON.parse(JSON.stringify(entity));
                    ActivitiesService.data = ActivitiesService.data || [];
                    ActivitiesService.data.push(result);
                });
            }
        }

        function updateEntityPermission(entity, context) {
            var statuses = ['new', 'assigned', 'in-progress', 'review', 'rejected', 'done'];

            entity.status = statuses[1];
            if (context.entityName === 'discussion') {
                entity.discussion = context.entityId;
            }

            if (entity.assign === undefined || entity.assign === null) {
                delete entity.assign;
            } else {

                // check the assignee is not a watcher already
                let filtered = entity.watchers.filter(watcher => {
                    return watcher._id === entity.assign;
                });

                // add assignee as watcher
                if (filtered.length === 0) {
                    entity.watchers.push(entity.assign);
                }
            }
            updateEntity(entity, context);
        }

        function permissions(entity, type, user) {
            if(Array.isArray(entity)){
                entity = entity[0];
            }
            var member = user || me;
            haveAnyPerms(entity, member);

            var qs = querystring.encode({
                user: me,
                type: type,
            });

            if (qs.length) {
                qs = '?' + qs;
            }

            //untill permissions backend route isn't complete
            var havePerm = false;

            if(entity.permissions.length !== 0){
                var usersPerms = _.find(entity.permissions, {'id': getUserId(member)});

                switch (usersPerms.level) {
                    case 'editor': havePerm = editorPerms[type];
                        break;
                    case 'commenter': havePerm = commenterPerms[type];
                        break;
                    case 'viewer': havePerm = viewerPerms[type];
                        break;
                }
            }
            return havePerm;
            // return $http.get(ApiUri + EntityPrefix + qs).then(function (result) {
            //     WarningsService.setWarning(result.headers().warning);
            //     return result.data;
            // }, function(err) {return err})
            //     .then(function (perms) {return perms});
        }
        return {
            haveAnyPerms: haveAnyPerms,
            havePermissions: permissions,
            haveEditorsPerms: haveEditorsPerms,
            getPermissionStatus: getPermissionStatus,
            updateEntityPermission: updateEntityPermission,
            changeUsersPermissions: changeUsersPermissions,
        };
    });
