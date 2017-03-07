'use strict';

angular.module('puppetPanel')
.controller('LoginCtrl', ['$scope', '$location', 'ApiService', function($scope, $location, ApiService) {
  if(ApiService.loggedIn()) {
    $location.path('/');
    return;
  }

  $scope.user = {};
  $scope.status = '';

  $scope.submit = function() {
    $scope.status = 'pending';
    ApiService.cleanErrorsInForm($scope.loginForm);

    ApiService.login($scope.user.login, $scope.user.password)
    .then(function(result) {
      $location.path('/');
    }, function(reason) {
      $scope.status = 'error';
      $scope.error = ApiService.convertErrorsToForm(reason.data, $scope.loginForm);
    });
  };
}]);
