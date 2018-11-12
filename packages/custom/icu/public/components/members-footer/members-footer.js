'use strict';

angular.module('mean.icu.ui.membersfooter', [])
    .directive('icuMembersFooter', function() {
        function controller($scope, $state, $injector, context, $stateParams, $timeout,
                            circlesService,PermissionsService, UsersService, ActivitiesService,TasksService,
                            ProjectsService, DiscussionsService, OfficeDocumentsService, FoldersService,
                            OfficesService) {

            var serviceMap = {
                task: 'TasksService',
                tasks: 'TasksService',
                project: 'ProjectsService',
                projects: 'ProjectsService',
                discussion: 'DiscussionsService',
                discussions: 'DiscussionsService',
                office: 'OfficesService',
                offices: 'OfficesService',
                folder: 'FoldersService',
                folders: 'FoldersService',
                officeDocument: 'OfficeDocumentsService',
                officeDocuments: 'OfficeDocumentsService',
                templateDoc: 'TemplateDocsService',
                templateDocs: 'TemplateDocsService',
            };
            $scope.hideAddButton = context.main=="templateDocs" ? false:true;
            $scope.me = UsersService.getMe().$$state.value;

            if($state.current.name.indexOf('search') !== -1){
                let entity = $state.current.name.split('.')[2];
                let service = $injector.get(serviceMap[entity]);

                service.getById($scope.entity._id)
                    .then(res => $scope.entity.watchers = res.watchers);
            }

            UsersService.getAll().then(users=>{
                if(!$scope.entity.watchers)return;

                for(var i = 0; i < $scope.entity.watchers.length; i++){
                    if(typeof $scope.entity.watchers[i] === 'string'){
                        $scope.entity.watchers[i] = _.find(users, { '_id': $scope.entity.watchers[i]});
                    }
                }
            });

            function changePerms(member, newPerms){
                $scope.entity = PermissionsService.changeUsersPermissions($scope.entity, member, newPerms, context);
            }

            $scope.userPermissionStatus = function(member){
                if(member) return PermissionsService.getPermissionStatus(member, $scope.entity) || "";
            };

            $scope.setEditor = function(user){
                return changePerms(user, 'editor');
            };

            $scope.setCommenter = function(user){
                return changePerms(user, 'commenter');
            };

            $scope.setViewer = function(user){
                return changePerms(user, 'viewer');
            };

            console.log("permissions: " + JSON.stringify($scope.entity.permissions,null,2)) ;
            var groupTypes = config.circles.footer;

            var getWatchersGroups = function() {
                $scope.watchersGroups = [];
                var obj;
                for (var i = 0; i < groupTypes.length; i++) {
                    if ($scope.entity.circles && $scope.entity.circles[groupTypes[i]])
                        for (var j = 0; j < $scope.entity.circles[groupTypes[i]].length; j++) {
                            obj = groups.filter(function(obj) {
                                if (obj._id === $scope.entity.circles[groupTypes[i]][j]) {
                                    return obj;
                                }
                            })[0];
                            if (obj) {
                                obj.type = groupTypes[i];
                                $scope.watchersGroups.push(obj);
                            }
                        }
                }
            };

            $scope.selfTest = function(member){
                member.selfTest = $scope.me._id === member._id;
                return member;
            };

            var getNotAssigned = function() {
                var arr1 = _.filter($scope.users, function(u) {
                    return u._id;
                });
                arr1 = _.pluck(arr1, '_id');
                var arr2 = _.pluck($scope.entity.watchers, '_id');
                var diff = _.difference(arr1, arr2);
                var notAssigned = _.filter($scope.users, function(obj) {
                    return diff.indexOf(obj._id) >= 0;
                });
                arr1 = _.pluck(groups, '_id');
                var arr3;
                for (var i = 0; i < groupTypes.length; i++) {
                    arr3 = $scope.entity.circles && $scope.entity.circles[groupTypes[i]] ? $scope.entity.circles[groupTypes[i]] : [];
                    arr1 = _.difference(arr1, arr3);
                }

                var groupsNotAssigned = _.filter(groups, function(obj) {
                    return arr1.indexOf(obj._id) >= 0;
                });
                return groupsNotAssigned.concat(notAssigned);
            }


            $scope.notAssigned = getNotAssigned();
            for(var i =0 ; i<$scope.notAssigned.length;i++){
                if($scope.notAssigned[i] && ($scope.notAssigned[i].job == undefined || $scope.notAssigned[i].job==null)){
                    $scope.notAssigned[i].job = $scope.notAssigned[i].name;
                }
            }

            var update = function(entity, member, action) {
                $scope.notAssigned = getNotAssigned();
                for(var i =0 ; i<$scope.notAssigned.length;i++){
                    if($scope.notAssigned[i] && ($scope.notAssigned[i].job == undefined || $scope.notAssigned[i].job==null)){
                        $scope.notAssigned[i].job = $scope.notAssigned[i].name;
                    }
                }
                var serviceName = serviceMap[$stateParams.id ? context.main : context.entityName];
                var service = $injector.get(serviceName);
                var data = {
                    name: member.name,
                    type: member.type ? member.type : 'user',
                    action: action,
                    frequentUser: member._id
                }

                if(entity.serial != undefined){
                    let serviceName = "OfficeDocumentsService",
                      service = $injector.get(serviceName);
                    let a = [];
                    entity.watchers.forEach(function(watcher){
                        if(watcher instanceof Object) {
                            a.push(String(watcher._id)) ;
                        }
                        else {
                            a.push(String(watcher)) ;
                        }
                    });

                    var json = {
                        'name':'watchers',
                        'newVal':a
                    }
                    entity.watchers = a;
                    return service.update(entity,json, action, member._id);
                }
                else{
                    return service.update(entity, data, action, member._id);
                }


                getWatchersGroups();
            };

            $scope.showSelect = false;
            var groups = [], allowed;

            circlesService.getmine().then(function(data) {
                for (var i = 0; data && i < groupTypes.length; i++){
                    allowed = data.allowed[groupTypes[i]];
                    allowed.forEach(function(g) {
                        g.type = groupTypes[i]
                    });
                    groups = groups.concat(allowed);
                }
                $scope.notAssigned = getNotAssigned();
                getWatchersGroups();
            });

            $scope.triggerSelect = function() {
                $scope.showSelect = !$scope.showSelect;
                if ($scope.showSelect) {
                    $scope.animate = false;
                }
            };

            $scope.otherWatchers = [];

            function idArrayToObjects(array){
                for(let i = 0; i < array.length; i++){
                    if(typeof array[i] === 'string'){
                        UsersService.getById(array[i]).then(user=>{
                            array[i] = user;
                        });
                    }
                }
            }

            $scope.showMoreWatchers = function() {
                let listWidth = $(".watchersList").width(),
                    watcherWidth = 45,
                    watchers = _.compact($scope.entity.watchers.concat($scope.watchersGroups)),
                    lastIndex = 0;

                for (let i = 0; i < watchers.length; i++) {
                    let elementPosition = (i + 1) * watcherWidth;
                    let isVisible = listWidth > elementPosition;
                    let isLast = i === watchers.length - 1;

                    if(isVisible){
                        lastIndex = i;
                        $scope.showMore = false;
                        $scope.otherWatchers = [];
                    }

                    if(isLast){
                        $scope.otherWatchers = watchers.slice(lastIndex, watchers.length - 1);
                        $scope.showMore = $scope.otherWatchers.length > 1;
                        idArrayToObjects($scope.otherWatchers);
                    }
                }
            };

            $scope.addMember = function(member) {
                $scope.showSelect = false;
                if (member.type) {

                    if (!$scope.entity.circles) $scope.entity.circles = {};
                    if (!$scope.entity.circles[member.type]) $scope.entity.circles[member.type] = [];
                    $scope.entity.circles[member.type].push(member._id);
                } else {
                    $scope.entity.watchers.push(member);
                    if($scope.entity.subTasks){
                        $scope.entity.subTasks.forEach((subTask)=>{
                            subTask.watchers.push(member);
                        });
                    }
                    if($scope.entity.subProjects){
                        $scope.entity.subProjects.forEach((subProject)=>{
                            subProject.watchers.push(member);
                        });
                    }
                }

                const backupEntity = JSON.parse(JSON.stringify($scope.entity));
                update($scope.entity, member, 'added')
                    .then(updatedEntity => {update($scope.entity, member, 'added').then(updatedEntity => {
                    let { watchers, permissions } = updatedEntity;
                    Object.assign($scope.entity, watchers, permissions);
                    $scope.animate = true;

                    var task = $scope.entity;
                    var me = $scope.me ;
                    if (context.entityName === 'discussion') {
                      task.discussion = context.entityId;
                    }
                    switch(context.main) {
                      case 'projects':
                        ProjectsService.updateWatcher(task, me, member).then(function (result) {
                          ActivitiesService.data.push(result);
                        });
                        break;
                      case 'tasks':
                        TasksService.updateWatcher(task, me, backupEntity).then(function (result) {
                          ActivitiesService.data.push(result);
                        });
                        break;
                      case 'discussions':
                        DiscussionsService.updateWatcher(task, me, member).then(function (result) {
                          ActivitiesService.data = ActivitiesService.data || [];
                          ActivitiesService.data.push(result);
                        });
                        break;
                      case 'officeDocuments':
                        OfficeDocumentsService.updateWatcher(task, me, member).then(function (result) {
                          ActivitiesService.data = ActivitiesService.data || [];
                          ActivitiesService.data.push(result);
                        });
                        break;
                      case 'folders':
                        FoldersService.updateWatcher(task, me, member).then(function (result) {
                          ActivitiesService.data = ActivitiesService.data || [];
                          ActivitiesService.data.push(result);
                        });
                        break;
                      case 'offices':
                        OfficesService.updateWatcher(task, me, member).then(function (result) {
                          ActivitiesService.data = ActivitiesService.data || [];
                          ActivitiesService.data.push(result);
                        });
                        break;
                    }
                  });
            };

          $scope.isDropdownwatchersOpen = false;

            $scope.toggled = function() {
                $scope.isDropdownwatchersOpen = !$scope.isDropdownwatchersOpen;
            };

            $scope.deleteMember = function(member) {
                if (member.type) {
                    $scope.entity.circles[member.type] = _.reject($scope.entity.circles[member.type], function(mem) {
                        return _.isEqual(member._id, mem);
                    });
                } else {
                    $scope.entity.watchers = _.reject($scope.entity.watchers, function(mem) {
                        return _.isEqual(member, mem);
                    });
                }

                const backupEntity = JSON.parse(JSON.stringify($scope.entity));
                update($scope.entity, member, 'removed');

                var task = $scope.entity ;
                var me = $scope.me ;
                if (context.entityName === 'discussion') {
                    task.discussion = context.entityId;
                }

                switch(context.main) {
                    case 'projects':
                        ProjectsService.updateWatcher(task, me, member, 'removeWatcher').then(function(result) {
                            ActivitiesService.data = ActivitiesService.data || [] ;
                            ActivitiesService.data.push(result);
                        });
                        break ;

                    case 'tasks':
                        TasksService.updateWatcher(task, me, backupEntity, 'remove').then(function(result) {
                            ActivitiesService.data.push(result);
                        });
                        break ;
                    case 'discussions':
                        DiscussionsService.updateWatcher(task, me, member, 'removeWatcher').then(function(result) {
                            ActivitiesService.data = ActivitiesService.data || [] ;
                            ActivitiesService.data.push(result);
                        });
                        break ;
                    case 'officeDocuments':
                        OfficeDocumentsService.updateWatcher(task, me, member, 'removeWatcher').then(function(result) {
                            ActivitiesService.data = ActivitiesService.data || [] ;
                            ActivitiesService.data.push(result);
                        });
                        break ;
                    case 'folders':
                        FoldersService.updateWatcher(task, me, member, 'removeWatcher').then(function(result) {
                            ActivitiesService.data = ActivitiesService.data || [] ;
                            ActivitiesService.data.push(result);
                        });
                        break ;
                    case 'offices':
                        OfficesService.updateWatcher(task, me, member, 'removeWatcher').then(function(result) {
                            ActivitiesService.data = ActivitiesService.data || [] ;
                            ActivitiesService.data.push(result);
                        });
                        break ;
                }
                $scope.showMoreWatchers();
            };
        }

        return {
            restrict: 'EA',
            scope: {
                entity: '=',
                users: '=',
                groups: '='
            },
            controller: controller,
            templateUrl: '/icu/components/members-footer/members-footer.html'
        };
    })
