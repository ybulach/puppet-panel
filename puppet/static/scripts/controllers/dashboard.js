'use strict';

angular.module('puppetPanel')
.controller('DashboardCtrl', ['$scope', '$location', '$http', '$filter', '$interval', 'ApiService', function($scope, $location, $http, $filter, $interval, ApiService) {
  if(!ApiService.loggedIn()) {
    $location.path('/login');
    return;
  }

  $scope.nodes = {error: '', lastrefresh: null, total: 0, data: {unchanged: 0, changed: 0, failed: 0, unreported: 0, unknown: 0}};

  // Get the nodes
  var refresh = function() {
    $scope.nodes.error = '';

    $http.get(ApiService.getConfig('url') + '/nodes')
    .then(function(result) {
      $scope.nodes.total = result.data.length;
      $scope.nodes.data.unchanged = $filter('filter')(result.data, {'status': 'unchanged'}, true).length;
      $scope.nodes.data.changed = $filter('filter')(result.data, {'status': 'changed'}, true).length;
      $scope.nodes.data.failed = $filter('filter')(result.data, {'status': 'failed'}, true).length;
      $scope.nodes.data.unreported = $filter('filter')(result.data, {'status': 'unreported'}, true).length;
      $scope.nodes.data.unknown = $filter('filter')(result.data, {'status': null}, true).length;
      $scope.nodes.lastrefresh = Date.now();
    }, function(reason) {
      $scope.nodes.error = 'Error while loading nodes informations.';
    });
  };
  refresh();

  // Autorefresh
  var autorefresh = $interval(function() {
    refresh();
  }, 1000 * 15);

  $scope.$on("$destroy", function() {
    $interval.cancel(autorefresh);
  });
}]);
