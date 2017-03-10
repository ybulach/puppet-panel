'use strict';

angular.module('puppetPanel')
.controller('HomeCtrl', ['$scope', '$location', '$http', '$filter', 'ApiService', function($scope, $location, $http, $filter, ApiService) {
  if(!ApiService.loggedIn()) {
    $location.path('/login');
    return;
  }

  $scope.nodes = {error: '', total: 0, data: {unchanged: [], changed: [], failed: [], unreported: [], unknown: []}};

  // Get the nodes
  $http.get(ApiService.getConfig('url') + '/nodes')
  .then(function(result) {
    $scope.nodes.total = result.data.length;
    $scope.nodes.data.unchanged = $filter('filter')(result.data, {'status': 'unchanged'}, true);
    $scope.nodes.data.changed = $filter('filter')(result.data, {'status': 'changed'}, true);
    $scope.nodes.data.failed = $filter('filter')(result.data, {'status': 'failed'}, true);
    $scope.nodes.data.unreported = $filter('filter')(result.data, {'status': 'unreported'}, true);
    $scope.nodes.data.unknown = $filter('filter')(result.data, {'status': null}, true);
  }, function(reason) {
    $scope.nodes.error = 'Error while loading nodes informations.';
  });

  // Show view when loaded
  $scope.$on('cfpLoadingBar:completed', function() {
    $scope.loaded = true;
  });
}]);
