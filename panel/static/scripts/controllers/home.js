'use strict';

angular.module('puppetPanel')
.controller('HomeCtrl', ['$scope', '$location', 'ApiService', function($scope, $location, ApiService) {
  if(!ApiService.loggedIn()) {
    $location.path('/login');
    return;
  }
}]);
