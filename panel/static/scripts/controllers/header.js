'use strict';

angular.module('puppetPanel')
.controller('HeaderCtrl', ['$scope', '$location', 'ApiService', function($scope, $location, ApiService) {
  // Default menus state
  $scope.isCollapsed = true;

  // Get user informations
  $scope.loggedIn = ApiService.loggedIn;
  $scope.loggedUser = ApiService.loggedUser;

  // Check for current page
  $scope.isCurrent = function(url) {
    return ($location.path() == url) || $location.path().startsWith(url + '/');
  };

  // Hide menu when changing URL (i.e. on menu click)
  $scope.$on('$locationChangeStart', function() {
    $scope.isCollapsed = true;
  });
}]);
