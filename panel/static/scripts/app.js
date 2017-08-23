// This file is part of puppet-panel.
//
// puppet-panel is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// puppet-panel is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with puppet-panel.  If not, see <http://www.gnu.org/licenses/>.

'use strict';

angular.module('puppetPanel', [
  'angular-loading-bar',
  'LocalStorageModule',
  'ngRoute',
  'ngTable',
  'ui.bootstrap',
  'ui.select'
])
.config(['$locationProvider', '$httpProvider', '$routeProvider', 'cfpLoadingBarProvider', function($locationProvider, $httpProvider, $routeProvider, cfpLoadingBarProvider) {
  $locationProvider.hashPrefix('');

  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';

  cfpLoadingBarProvider.includeSpinner = false;
  cfpLoadingBarProvider.parentSelector = '#loading-bar-container';

  $routeProvider
    // User authentication / settings
    .when('/login', {
      templateUrl: 'static/views/login.html',
      controller: 'LoginCtrl'
    })
    .when('/logout', {
      templateUrl: 'static/views/logout.html',
      controller: 'LogoutCtrl'
    })
    .when('/account', {
      templateUrl: 'static/views/account.html',
      controller: 'AccountCtrl'
    })

    // Users administration
    .when('/users', {
      templateUrl: 'static/views/users.html',
      controller: 'UsersCtrl'
    })
    .when('/users/:username', {
      templateUrl: 'static/views/user.html',
      controller: 'UserCtrl',
      reloadOnSearch: false
    })

    // Redirect to default
    .otherwise({
      redirectTo: '/'
    });
}]);
