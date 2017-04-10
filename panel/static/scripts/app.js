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

    // Redirect to default
    .otherwise({
      redirectTo: '/'
    });
}]);
