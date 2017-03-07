'use strict';

angular.module('puppetPanel')
.controller('HeaderCtrl', ['$scope', '$location', 'ApiService', function($scope, $location, ApiService) {
  // Get user informations
  $scope.loggedIn = ApiService.loggedIn;
  $scope.loggedUser = ApiService.loggedUser;

  // Check for current page
  $scope.isCurrent = function(url) {
    return $location.path() == url;
  };
}]);
