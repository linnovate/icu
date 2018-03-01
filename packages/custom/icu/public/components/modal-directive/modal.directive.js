'use strict';
angular.module('mean.icu.ui.modaldeletetasksbyentity', [])
    .directive('icuOpenModal', function ($state, $uibModal,UsersService, OfficeDocumentsService, TemplateDocsService ) {

        if( window.config.version !=  localStorage.getItem("icuVersion")){
            $uibModal.open({
                animation: true,
                size:  'lg',
                templateUrl: '/icu/components/modal-directive/whats-new/whats-new.html',
                controller: controllerwhatsNew,
                resolve: {

                }
            });
        }

        function link(scope, elem, attrs) {
            elem.bind('click', function() {

                if($state.current.name.indexOf('main.tasks.byentity') != -1 && scope.entityName != 'Document')
                   scope.showModal --;

                if(scope.showModal) {
                    buildModal();
                } else {
                  scope.deleteFn();
                }
            });

            function buildModal() {
                if(scope.modalName == 'receive' && scope.entityName == "officeDocument") {
//                    console.log("buildModal receive", scope) ;
                    var modalInstance = $uibModal.open({
                        animation: true,
                        size:  'md',
                        templateUrl: '/icu/components/modal-directive/receiveModal.html',
                        controller: dragCtrl,
                        resolve: {
                            officeDocument: function () {
                                return scope.data;
                            },
                            people:function () {
                                return scope.people;
                            }
                        }
                    });
                }
                else if(scope.modalName == 'currentUser') {
//                    console.log("buildModal distributed", scope) ;
                    var modalInstance = $uibModal.open({
                        animation: true,
                        size:  'lg',
                        templateUrl: '/icu/components/modal-directive/modalUser.html',
                        controller: userCtrl,
                        resolve: {
                            officeDocument: function () {
                                return scope.data;
                            },
                            people:function () {
                                return scope.people;
                            },
                            currentUser: function () {
                                return scope.currentUser;
                            }
                        }
                    });
                }
                else if(scope.modalName == 'distributed' && scope.entityName == "officeDocument") {
//                    console.log("buildModal distributed", scope) ;
                    var modalInstance = $uibModal.open({
                        animation: true,
                        size:  'md',
                        templateUrl: '/icu/components/modal-directive/distributedModal.html',
                        controller: distributedCtrl,
                        resolve: {
                            officeDocument: function () {
                                return scope.data;
                            },
                            people:function () {
                                return scope.people;
                            }
                        }
                    });
                }

                else if(scope.send && scope.entityName == "officeDocument"){
                    var modalInstance = $uibModal.open({
                        animation: true,
                        size:  'lg',
                        templateUrl: '/icu/components/modal-directive/sendDocument.html',
                        controller: controllerDocument,
                        resolve: {
                            officeDocument: function () {
                                return scope.data;
                            },
                            people:function () {
                                return scope.people;
                            }
                        }

                    });

                }
                else if(scope.modalName == 'template' && scope.entityName == "officeDocument"){
                    var modalInstance = $uibModal.open({
                        animation: true,
                        size:  'lg',
                        templateUrl: '/icu/components/modal-directive/templateModal/template.html',
                        controller: controllerTemplate,
                        resolve: {
                            templates: function () {
                                if(scope.data.folder == undefined){
                                  return [];
                                }else{
                                    return TemplateDocsService.getTemplatesByFolder(scope.data.folder);
                                }
                            },
                            officeDocument: function(){
                                return scope.data;
                            }
                        }

                    });
                }else {
                var modalInstance = $uibModal.open({
                    animation: true,
                    templateUrl: '/icu/components/modal-directive/modal.html',
                    controller: controller,
                    resolve: {
                        entity: function () {
                            return scope.entityName;
                        }
                    }

                });
            }

                modalInstance.result.then(function () {
                    scope.deleteFn();
                }, function () {
                    console.log('Modal dismissed');
                });
            }
        };

        return {
            restrict: 'A',
            scope: {
                showModal: '=',
                deleteFn: '&',
                entityName: '@',
                send: '=',
                sendDocument: '&',
                data: '=',
                people: "=",
                modalName: '@'
            },
            link: link
        };
    });

function controller($scope, $uibModalInstance, $filter, entity) {
    $scope.entity = {type: entity};

    $scope.ok = function () {
        if($scope.entity.textDelete && $scope.entity.textDelete == $filter('i18next')('DELETE'))
            $uibModalInstance.close();
        else
            $scope.cancel();

    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
}

function controllerDocument($scope, $state,$uibModalInstance, $filter,officeDocument, people, OfficeDocumentsService) {

    $scope.officeDocument = officeDocument;
    $scope.people = people;
    // $scope.sendingForm={};
    // $scope.sendingForm.title = undefined;
    // $scope.sendingForm.doneBy = undefined;
    // $scope.sendingForm.classification = undefined;

    $scope.classificationList = ['unclassified','private','secret','topSecret' ];

    $scope.ok = function (sendingForm) {

        var elem = document.getElementById("message");
        alertify.parent(elem);
        alertify.logPosition("bottom right");
        console.log(sendingForm)

        if(sendingForm.classification == undefined ||
            sendingForm.doneBy == undefined ||
            sendingForm.title == ""){
            alertify.error("נא למלא הנדון סיווג ולטיפול");
        }else{

            OfficeDocumentsService.sendDocument(sendingForm, $scope.officeDocument).then(function(result){
                console.log("===RETURNED===");
                console.dir(result);
                // Object.keys(result).forEach(function(key){
                    //    $scope.officeDocument[key]=result[key];
                // });
                $state.reload();
                $scope.cancel();
                alertify.reset();
                alertify.logPosition("bottom right");
                alertify.success("המסמך נשלח בהצלחה");
        });
    }
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
}


function dragCtrl($scope, $state,$uibModalInstance, $filter, officeDocument, people, OfficeDocumentsService) {
    console.log("dragCtrl") ;
    $scope.officeDocument = officeDocument;
    $scope.dragOptions = {
        start: function(e) {
//          console.log("STARTING");
        },
        drag: function(e) {
//          console.log("DRAGGING");
        },
        stop: function(e) {
//          console.log("STOPPING");
        },
        receive: function(e) {
            // $scope.receiveStatus = "received" ;
            OfficeDocumentsService.receiveDocument($scope.officeDocument) ;
        },
        container: 'dragcontainer'
    }
    $scope.ok = function (sendingForm) {
            $scope.cancel();
    };
    $scope.cancel = function () {
        $state.reload();
        $uibModalInstance.dismiss('cancel');
    };
}

function userCtrl($scope, $state,$uibModalInstance, $filter,officeDocument, people, UsersService, OfficeDocumentsService) {

    $scope.officeDocument = officeDocument;
    $scope.people = people;
    $scope.currentUser = UsersService.getMe().$$state.value;
    $scope.tabs = [
        {
            title: 'General',
        },
        {
            title: 'Notifications',
        },
        {
            title: 'Components',
        }
    ];
    $scope.activeTab = $scope.tabs[0];
    $scope.setActiveTab = function(tab){
        $scope.activeTab = tab;
    };
    $scope.isActive = function (tab){
        if($scope.activeTab.title == tab.title){
            return 'activeTab'
        }
        return '';
    };
    $scope.filters = [
        {
            title: 'Home Screen Filter',
            options: [
                '1_option',
                '2_option',
            ]
        }
    ];

    $scope.uploadAvatar = function(files) {
        if (files.length) {
            var file = files[0];
            UsersService.updateAvatar(file)
                .success(function(data) {
                    $scope.avatar = data.avatar;
                    $scope.hash = Math.random();
                    $scope.currentUser.profile.avatar = data.avatar;
                    updatePage();
                });
        }
    };

    $scope.resetAvatar = function () {
        // $scope.currentUser.profile.avatar = '';
        UsersService.resetAvatar();
        updatePage();
    };

    $scope.notifications = [
        {
            title: 'IWantToGetMailEveryWeekAboutMyTasks',
            hint: 'this hint will help you to understand',
            options: [
                'yes',
                'no',
            ],
            model: $scope.currentUser.GetMailEveryWeekAboutMyTasks,
            name: 'GetMailEveryWeekAboutMyTasks',
        },
        {
            title: 'IWantToGetMailEveryWeekAboutGivenTasks',
            hint: 'this hint will help you to understand',
            options: [
                'yes',
                'no',
            ],
            model: $scope.currentUser.GetMailEveryWeekAboutGivenTasks,
            name: 'GetMailEveryWeekAboutGivenTasks',
        },
        {
            title: 'IWantToGetMailEveryDayAboutMyTasks',
            hint: 'this hint will help you to understand',
            options: [
                'yes',
                'no',
            ],
            model: $scope.currentUser.GetMailEveryDayAboutMyTasks,
            name: 'GetMailEveryDayAboutMyTasks',
        },
    ];

    $scope.updateNotificationSettings = function(notification, option){
        $scope.currentUser[notification.name] = option;
        updatePage();
    };

    $scope.classificationList = ['unclassified','private','secret','topSecret' ];

    $scope.ok = function (showUser) {

        var elem = document.getElementById("message");
        alertify.parent(elem);
        alertify.logPosition("bottom right");
        console.log(showUser)

        if(showUser.classification == undefined ||
            showUser.doneBy == undefined ||
            showUser.title == ""){
            alertify.error("access denied");
        }else{

            console.log('access granted')
        }
    };

    $scope.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };

    function updatePage(){
        UsersService.update($scope.currentUser).then(function() {
            $state.go('main.tasks', null, { reload: true });
        });
    }
}


function distributedCtrl($scope, $state,$uibModalInstance, $filter, officeDocument, people, OfficeDocumentsService) {
    $scope.distributedList = [] ;
    if(officeDocument.sentTo && officeDocument.sentTo.length) {
        OfficeDocumentsService.sentToDocument(officeDocument).then(function(res) {
        // gets the user names, with ids as present in the sentTo field
        var resWithDate = res.map(function(r){
            var currentSentTo = officeDocument.readBy.filter(function(rb){
                return rb.user == r._id }) ;

                if(currentSentTo.length) {
                return Object.assign({date: currentSentTo[0].date, received: true}, r) ;

            }
            else {
                return Object.assign({received: false}, r) ;
            }
         } )
        // add the read date as it appears on the doc.
        $scope.distributedList  = resWithDate ;
    }) ;
    }
    else {
        $scope.distributedList = [] ;
    }

    $scope.officeDocument = officeDocument;
    $scope.ok = function (sendingForm) {
            // console.log($scope.receiveStatus);
            $scope.cancel();
    };
    $scope.cancel = function () {
        $state.reload();
        $uibModalInstance.dismiss('cancel');
    };
}

// function controllerTemplate($scope, $uibModalInstance, $filter) {


//         $scope.ok = function (sendingForm) {

//            // OfficeDocumentsService.sendDocument(sendingForm, $scope.officeDocument)
//         };

//         $scope.cancel = function () {
//             $uibModalInstance.dismiss('cancel');
//         };
// }
