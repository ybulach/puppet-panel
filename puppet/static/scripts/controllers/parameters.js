'use strict';

angular.module('puppetPanel')
.controller('ParametersCtrl', ['$scope', '$location', '$uibModal', '$http', '$document', 'ApiService', 'NgTableParams', function($scope, $location, $uibModal, $http, $document, ApiService, NgTableParams) {
  if(!ApiService.loggedIn()) {
  	$location.path('/login');
    return;
  }

  $scope.parameters = {error: '', status: '', data: []};
  $scope.parameters.table = new NgTableParams({sorting: {name: "asc"}}, {});

  // Get the parameters
  $http.get(ApiService.getConfig('url') + '/parameters')
  .then(function(result) {
    $scope.parameters.data = result.data;
    $scope.parameters.table.settings({dataset: $scope.parameters.data});
  }, function(reason) {
    $scope.parameters.error = 'Error while loading parameters informations.';
  });

  // Show view when loaded, and enable submit buttons
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });
}]);
