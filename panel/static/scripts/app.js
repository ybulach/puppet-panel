'use strict';

angular.module('puppetPanel', [
  'angular-loading-bar',
  'LocalStorageModule',
  'ngRoute',
  'ui.bootstrap'
])
.config(['$locationProvider', '$httpProvider', '$routeProvider', function($locationProvider, $httpProvider, $routeProvider) {
  $locationProvider.hashPrefix('');

  $httpProvider.defaults.xsrfCookieName = 'csrftoken';
  $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';

  $routeProvider
    // Dashboard / default view
    .when('/', {
      templateUrl: 'static/views/home.html',
      controller: 'HomeCtrl'
    })

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
