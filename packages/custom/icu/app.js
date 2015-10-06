'use strict';

/*
 * Defining the Package
 */

var Module = require('meanio').Module;

var ICU = new Module('icu');

/*
 * All MEAN packages require registration
 * Dependency injection is used to define required modules
 */
ICU.register(function (app, auth, database) {

    //We enable routing. By default the Package Object is passed to the routes
    ICU.routes(app, auth, database);

    app.set('views', __dirname + '/server/views');

    //We are adding a link to the main menu for all authenticated users
    ICU.menus.add({
        title: 'ICU example page',
        link: 'ICU example page',
        menu: 'main'
    });

    ICU.aggregateAsset('css', 'styles.css');
    ICU.aggregateAsset('css', '../lib/angular-ui-select/dist/select.css');
    ICU.aggregateAsset('css', '../lib/jquery-ui/themes/pepper-grinder/jquery-ui.min.css');
    ICU.aggregateAsset('css', '../lib/angularjs-color-picker/angularjs-color-picker.css');

    ICU.aggregateAsset('js', '../lib/underscore/underscore.js');
    ICU.aggregateAsset('js', '../lib/angular-ui-select/dist/select.js');
    ICU.aggregateAsset('js', '../lib/jquery-ui/jquery-ui.js');
    ICU.aggregateAsset('js', '../lib/angular-ui-date/src/date.js');
    ICU.aggregateAsset('js', '../lib/moment/moment.js');
    ICU.aggregateAsset('js', '../lib/ng-file-upload/ng-file-upload.min.js');
    ICU.aggregateAsset('js', '../lib/ngInfiniteScroll/build/ng-infinite-scroll.min.js');

    ICU.aggregateAsset('js', '../lib/tinycolor/tinycolor.js', {weight: 0});
    ICU.aggregateAsset('js', '../lib/angularjs-color-picker/angularjs-color-picker.js', {weight: 1});

    ICU.aggregateAsset('js', '../lib/angular-sanitize/angular-sanitize.js', {weight: 0});
    ICU.aggregateAsset('js', '../lib/i18next/i18next.js', {weight: 1});
    ICU.aggregateAsset('js', '../lib/ng-i18next/dist/ng-i18next.js', {weight: 2});

    ICU.angularDependencies([
        'jm.i18next',
        'mean.medium-editor',
        'ui.select',
        'ui.date',
        'ngFileUpload',
        'color.picker',
        'mean.system',
        'mean.users',
        'mean.icu.ui.autofocus',
        'mean.icu.ui.login',
        'mean.icu.ui.register',
        'mean.icu.ui.profile',
        'mean.icu.ui.displayby',
        'mean.icu.ui.sidepane',
        'mean.icu.ui.middlepane',
        'mean.icu.ui.detailspane',
        'mean.icu.ui.userlist',
        'mean.icu.ui.userdetails',
        'mean.icu.ui.tasklist',
        'mean.icu.ui.tasklistdirective',
        'mean.icu.ui.taskdetails',
        'mean.icu.ui.projectlist',
        'mean.icu.ui.projectlistdirective',
        'mean.icu.ui.projectdetails',
        'mean.icu.ui.discussionlist',
        'mean.icu.ui.discussionlistdirective',
        'mean.icu.ui.discussiondetails',
        'mean.icu.ui.attachmentdetails',
        'mean.icu.ui.notificationsheader',
        'mean.icu.ui.membersfooter',
        'mean.icu.ui.tabs',
        'mean.icu.ui.rows',
        'mean.icu.ui.changecontent',
        'mean.icu.ui.avatar',
        'mean.icu.ui.colorpicker',
        'mean.icu.ui.search',
        'mean.icu.ui.searchlist',
        'mean.icu.data.activitiesservice',
        'mean.icu.data.documentsservice',
        'mean.icu.data.usersservice',
        'mean.icu.data.notificationsservice',
        'mean.icu.data.projectsservice',
        'mean.icu.data.discussionsservice',
        'mean.icu.data.tasksservice',
        'mean.icu.data.settingsservice',
        'mean.icu.data.searchservice',
        'mean.icu.data.constants',
        'mean.icu.decorators.pdsDecorator',
        'mean.icu.decorators.cacheDecorator',
        'infinite-scroll'
    ]);

    ICU.settings({
        'language': 'en-US'
    }, function (err, settings) {
        //you now have the settings object
    });

    /**
     //Uncomment to use. Requires meanio@0.3.7 or above
     // Save settings with callback
     // Use this for saving data from administration pages
     ICU.settings({
        'someSetting': 'some value'
    }, function(err, settings) {
        //you now have the settings object
    });

     // Another save settings example this time with no callback
     // This writes over the last settings.
     ICU.settings({
        'anotherSettings': 'some value'
    });

     // Get settings. Retrieves latest saved settigns
     ICU.settings(function(err, settings) {
        //you now have the settings object
    });
     */

    //class someClass {
    //	constructor(name, age) {
    //		this.name = name;
    //		this.age = age;
    //	}
    //
    //	sayName() {
    //		console.log('some class ' + this.name);
    //	}
    //}
    //
    //class Child extends someClass {
    //	constructor(name, age) {
    //		super(name, age);
    //	}
    //
    //	// Override the someClass method above
    //	sayName() {
    //		// This will call someClass.sayName() triggering the old alert
    //		// Which will just display our name
    //		super();
    //
    //		// This will trigger the new alert which has labels and our age
    //		console.log('Name:' + this.name + ' Age:' + this.age);
    //	}
    //}
    //
    //var myChild = new Child('dwayne', 27);
    //myChild.sayName();

    return ICU;
});
