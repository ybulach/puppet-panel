'use strict';

angular.module('puppetPanel')
.controller('LogoutCtrl', ['$scope', '$location', 'ApiService', function($scope, $location, ApiService) {
  if(!ApiService.loggedIn()) {
    $location.path('/login');
    return;
  }

  $scope.error = '';

  ApiService.logout()
  .then(function(result) {
    $location.path('/login');
  }, function(reason) {
      $scope.error = 'An error occurred while logging out: ' + reason.statusText;
  });
}]);
