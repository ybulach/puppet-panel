'use strict';

angular.module('puppetPanel')
.controller('ReportCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', '$routeParams', 'ApiService', function($scope, $location, $uibModal, $http, $document, $routeParams, ApiService) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.transaction = $routeParams.transaction;
  $scope.report = {error: '', data: []};

  // Checks params
  if(!$routeParams.transaction) {
    $location.path('/reports');
    return;
  }

  // Get the report
  $http.get(ApiService.getConfig('url') + '/reports/' + $routeParams.transaction)
  .then(function(result) {
    $scope.report.data = result.data;
  }, function(reason) {
    $scope.report.error = 'Error while loading report informations: ' + reason.statusText;
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });
}]);
