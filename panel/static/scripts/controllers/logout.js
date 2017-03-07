'use strict';

angular.module('puppetPanel')
.controller('LogoutCtrl', ['$scope', '$location', 'ApiService', function($scope, $location, ApiService) {
  if(!ApiService.loggedIn()) {
    $location.path('/login');
    return;
  }

  ApiService.logout().then(function() {
    $location.path('/login');
    return;
  });
}]);
